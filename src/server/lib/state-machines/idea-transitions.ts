/**
 * Idea Lifecycle State Machine
 *
 * All idea status changes MUST go through `transitionIdea()`.
 * Direct database updates to idea.status are forbidden.
 *
 * States: DRAFT → QUALIFICATION → COMMUNITY_DISCUSSION → HOT →
 *         EVALUATION → SELECTED_CONCEPT / SELECTED_IMPLEMENTATION →
 *         IMPLEMENTED / IMPLEMENTATION_CANCELED / ARCHIVED
 *
 * Key behaviors:
 * - Transitions are validated against allowed paths
 * - Guard functions enforce preconditions (campaign phase, roles, etc.)
 * - Campaign-phase coupling prevents ideas from advancing beyond their campaign
 * - Coach qualification gate with structured feedback
 * - Archive/unarchive from any active state
 * - Every transition emits domain events via EventBus
 */

import { IdeaStatus, CampaignStatus } from "@/shared/types/enums";
import type {
  IdeaTransitionContext,
  TransitionResult,
  CoachFeedback,
} from "@/shared/types/idea";
import { eventBus } from "@/server/lib/events/event-bus";

// ---------------------------------------------------------------------------
// Transition map: defines which status transitions are allowed
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<IdeaStatus, IdeaStatus[]> = {
  [IdeaStatus.DRAFT]: [
    IdeaStatus.QUALIFICATION,
    IdeaStatus.COMMUNITY_DISCUSSION,
    IdeaStatus.ARCHIVED,
  ],
  [IdeaStatus.QUALIFICATION]: [
    IdeaStatus.COMMUNITY_DISCUSSION,
    IdeaStatus.DRAFT, // reject → back to draft
    IdeaStatus.ARCHIVED,
  ],
  [IdeaStatus.COMMUNITY_DISCUSSION]: [
    IdeaStatus.HOT,
    IdeaStatus.EVALUATION,
    IdeaStatus.ARCHIVED,
  ],
  [IdeaStatus.HOT]: [IdeaStatus.EVALUATION, IdeaStatus.ARCHIVED],
  [IdeaStatus.EVALUATION]: [
    IdeaStatus.SELECTED_CONCEPT,
    IdeaStatus.SELECTED_IMPLEMENTATION,
    IdeaStatus.ARCHIVED,
  ],
  [IdeaStatus.SELECTED_CONCEPT]: [
    IdeaStatus.SELECTED_IMPLEMENTATION,
    IdeaStatus.ARCHIVED,
  ],
  [IdeaStatus.SELECTED_IMPLEMENTATION]: [
    IdeaStatus.IMPLEMENTED,
    IdeaStatus.IMPLEMENTATION_CANCELED,
    IdeaStatus.ARCHIVED,
  ],
  [IdeaStatus.IMPLEMENTED]: [IdeaStatus.ARCHIVED],
  [IdeaStatus.IMPLEMENTATION_CANCELED]: [
    IdeaStatus.SELECTED_IMPLEMENTATION, // retry
    IdeaStatus.ARCHIVED,
  ],
  [IdeaStatus.ARCHIVED]: [], // unarchive handled separately
};

/**
 * Maps idea statuses to the minimum campaign phase required.
 * Ideas cannot advance to a status unless the campaign is at or past
 * the required phase. Channel ideas (no campaign) skip this check.
 */
const CAMPAIGN_PHASE_REQUIREMENTS: Partial<
  Record<IdeaStatus, CampaignStatus[]>
> = {
  [IdeaStatus.QUALIFICATION]: [
    CampaignStatus.SUBMISSION,
    CampaignStatus.DISCUSSION_VOTING,
    CampaignStatus.EVALUATION,
    CampaignStatus.CLOSED,
  ],
  [IdeaStatus.COMMUNITY_DISCUSSION]: [
    CampaignStatus.SUBMISSION,
    CampaignStatus.DISCUSSION_VOTING,
    CampaignStatus.EVALUATION,
    CampaignStatus.CLOSED,
  ],
  [IdeaStatus.HOT]: [
    CampaignStatus.DISCUSSION_VOTING,
    CampaignStatus.EVALUATION,
    CampaignStatus.CLOSED,
  ],
  [IdeaStatus.EVALUATION]: [CampaignStatus.EVALUATION, CampaignStatus.CLOSED],
  [IdeaStatus.SELECTED_CONCEPT]: [
    CampaignStatus.EVALUATION,
    CampaignStatus.CLOSED,
  ],
  [IdeaStatus.SELECTED_IMPLEMENTATION]: [
    CampaignStatus.EVALUATION,
    CampaignStatus.CLOSED,
  ],
};

// ---------------------------------------------------------------------------
// Guard functions
// ---------------------------------------------------------------------------

export class TransitionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

type Guard = (ctx: IdeaTransitionContext) => void;

function guardTransitionAllowed(
  ctx: IdeaTransitionContext,
  targetStatus: IdeaStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[ctx.idea.status];
  if (!allowed.includes(targetStatus)) {
    throw new TransitionError(
      `Cannot transition from ${ctx.idea.status} to ${targetStatus}`,
      "INVALID_TRANSITION",
    );
  }
}

function guardCampaignPhase(
  ctx: IdeaTransitionContext,
  targetStatus: IdeaStatus,
): void {
  // Channel ideas or ideas without a campaign skip campaign phase checks
  if (!ctx.campaign) return;

  const requiredPhases = CAMPAIGN_PHASE_REQUIREMENTS[targetStatus];
  if (!requiredPhases) return;

  if (!requiredPhases.includes(ctx.campaign.status)) {
    throw new TransitionError(
      `Campaign is in ${ctx.campaign.status} phase; idea cannot move to ${targetStatus}`,
      "CAMPAIGN_PHASE_MISMATCH",
    );
  }
}

function guardSubmitRequiresQualification(
  ctx: IdeaTransitionContext,
  targetStatus: IdeaStatus,
): void {
  if (ctx.idea.status !== IdeaStatus.DRAFT) return;

  if (
    targetStatus === IdeaStatus.COMMUNITY_DISCUSSION &&
    ctx.campaign?.hasQualificationPhase
  ) {
    throw new TransitionError(
      "Campaign requires qualification; idea must go through QUALIFICATION first",
      "QUALIFICATION_REQUIRED",
    );
  }

  if (
    targetStatus === IdeaStatus.QUALIFICATION &&
    ctx.campaign &&
    !ctx.campaign.hasQualificationPhase
  ) {
    throw new TransitionError(
      "Campaign does not have a qualification phase",
      "NO_QUALIFICATION_PHASE",
    );
  }
}

function guardCoachApproval(
  ctx: IdeaTransitionContext,
  targetStatus: IdeaStatus,
): void {
  if (ctx.idea.status !== IdeaStatus.QUALIFICATION) return;
  if (targetStatus === IdeaStatus.ARCHIVED) return;

  if (targetStatus === IdeaStatus.COMMUNITY_DISCUSSION) {
    if (!ctx.coachFeedback) {
      throw new TransitionError(
        "Coach feedback is required to move from QUALIFICATION",
        "COACH_FEEDBACK_REQUIRED",
      );
    }
    if (ctx.coachFeedback.decision !== "APPROVE") {
      throw new TransitionError(
        "Coach must approve the idea to move to COMMUNITY_DISCUSSION",
        "COACH_APPROVAL_REQUIRED",
      );
    }
  }

  if (targetStatus === IdeaStatus.DRAFT) {
    if (!ctx.coachFeedback) {
      throw new TransitionError(
        "Coach feedback is required to reject an idea",
        "COACH_FEEDBACK_REQUIRED",
      );
    }
    if (
      ctx.coachFeedback.decision !== "REJECT" &&
      ctx.coachFeedback.decision !== "REQUEST_CHANGES"
    ) {
      throw new TransitionError(
        "Coach must reject or request changes to send idea back to DRAFT",
        "COACH_REJECTION_REQUIRED",
      );
    }
  }
}

function guardArchiveRequiresReason(
  ctx: IdeaTransitionContext,
  targetStatus: IdeaStatus,
): void {
  if (targetStatus !== IdeaStatus.ARCHIVED) return;
  if (!ctx.reason) {
    throw new TransitionError(
      "A reason is required when archiving an idea",
      "ARCHIVE_REASON_REQUIRED",
    );
  }
}

function guardManagerOrCoachRole(
  ctx: IdeaTransitionContext,
  targetStatus: IdeaStatus,
): void {
  // Contributors can submit their own drafts
  if (
    ctx.idea.status === IdeaStatus.DRAFT &&
    (targetStatus === IdeaStatus.QUALIFICATION ||
      targetStatus === IdeaStatus.COMMUNITY_DISCUSSION)
  ) {
    if (ctx.actorId === ctx.idea.contributorId) return;
  }

  // Coach can handle qualification decisions
  if (ctx.idea.status === IdeaStatus.QUALIFICATION) {
    if (ctx.actorId === ctx.idea.ideaCoachId) return;
  }

  // Everything else requires manager role
  const managerRoles = ["MANAGER", "INNOVATION_MANAGER", "PLATFORM_ADMIN"];
  const hasManagerRole = ctx.actorRoles.some((role) =>
    managerRoles.includes(role),
  );
  if (!hasManagerRole) {
    throw new TransitionError(
      "Insufficient permissions for this transition",
      "INSUFFICIENT_PERMISSIONS",
    );
  }
}

// Ordered list of all guards applied to every transition
const GUARDS: Array<
  (ctx: IdeaTransitionContext, targetStatus: IdeaStatus) => void
> = [
  guardTransitionAllowed,
  guardCampaignPhase,
  guardSubmitRequiresQualification,
  guardCoachApproval,
  guardArchiveRequiresReason,
  guardManagerOrCoachRole,
];

// ---------------------------------------------------------------------------
// Core transition function
// ---------------------------------------------------------------------------

/**
 * Transition an idea to a new status.
 *
 * This is the ONLY way to change an idea's status. It:
 * 1. Validates the transition is allowed
 * 2. Runs all guard functions
 * 3. Emits domain events via EventBus
 * 4. Returns a TransitionResult for the caller to persist
 *
 * The caller is responsible for persisting the status change to the database
 * using the returned TransitionResult. This keeps the state machine
 * decoupled from the persistence layer.
 */
export function transitionIdea(
  ctx: IdeaTransitionContext,
  targetStatus: IdeaStatus,
): TransitionResult {
  // Run all guards
  for (const guard of GUARDS) {
    guard(ctx, targetStatus);
  }

  const result: TransitionResult = {
    previousStatus: ctx.idea.status,
    newStatus: targetStatus,
    ideaId: ctx.idea.id,
    actorId: ctx.actorId,
    timestamp: new Date(),
    reason: ctx.reason,
    coachFeedback: ctx.coachFeedback,
  };

  // Fire events (non-blocking — callers can await if needed)
  emitTransitionEvents(ctx, result);

  return result;
}

/**
 * Unarchive an idea, restoring it to its previous status.
 *
 * This is a separate function because ARCHIVED has no outbound
 * transitions in the normal map. Unarchive requires:
 * - The idea is currently ARCHIVED
 * - A valid previousStatus to restore to
 * - Manager permissions
 */
export function unarchiveIdea(
  ctx: IdeaTransitionContext,
  restoreToStatus: IdeaStatus,
): TransitionResult {
  if (ctx.idea.status !== IdeaStatus.ARCHIVED) {
    throw new TransitionError(
      "Can only unarchive an idea that is currently ARCHIVED",
      "NOT_ARCHIVED",
    );
  }

  if (restoreToStatus === IdeaStatus.ARCHIVED) {
    throw new TransitionError(
      "Cannot unarchive to ARCHIVED status",
      "INVALID_RESTORE_STATUS",
    );
  }

  // Validate restore status is a real status
  if (!Object.values(IdeaStatus).includes(restoreToStatus)) {
    throw new TransitionError(
      `Invalid restore status: ${restoreToStatus}`,
      "INVALID_RESTORE_STATUS",
    );
  }

  // Check campaign phase compatibility for restored status
  guardCampaignPhase(ctx, restoreToStatus);

  // Require manager permissions
  const managerRoles = ["MANAGER", "INNOVATION_MANAGER", "PLATFORM_ADMIN"];
  const hasManagerRole = ctx.actorRoles.some((role) =>
    managerRoles.includes(role),
  );
  if (!hasManagerRole) {
    throw new TransitionError(
      "Only managers can unarchive ideas",
      "INSUFFICIENT_PERMISSIONS",
    );
  }

  const result: TransitionResult = {
    previousStatus: IdeaStatus.ARCHIVED,
    newStatus: restoreToStatus,
    ideaId: ctx.idea.id,
    actorId: ctx.actorId,
    timestamp: new Date(),
    reason: ctx.reason,
  };

  // Emit unarchive event
  eventBus.emit("idea.unarchived", {
    ideaId: ctx.idea.id,
    restoredStatus: restoreToStatus,
    actorId: ctx.actorId,
    timestamp: result.timestamp,
  });

  eventBus.emit("idea.statusChanged", {
    ideaId: ctx.idea.id,
    previousStatus: IdeaStatus.ARCHIVED,
    newStatus: restoreToStatus,
    actorId: ctx.actorId,
    campaignId: ctx.idea.campaignId,
    timestamp: result.timestamp,
    reason: ctx.reason,
  });

  return result;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Get all valid target statuses for an idea given its current state.
 * Useful for UI to show available actions.
 */
export function getAvailableTransitions(
  currentStatus: IdeaStatus,
): IdeaStatus[] {
  if (currentStatus === IdeaStatus.ARCHIVED) {
    return []; // unarchive is a separate operation
  }
  return [...ALLOWED_TRANSITIONS[currentStatus]];
}

/**
 * Check whether a specific transition is structurally valid
 * (ignoring guards like permissions, campaign phase, etc.).
 */
export function isTransitionAllowed(from: IdeaStatus, to: IdeaStatus): boolean {
  if (from === IdeaStatus.ARCHIVED) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Event emission
// ---------------------------------------------------------------------------

function emitTransitionEvents(
  ctx: IdeaTransitionContext,
  result: TransitionResult,
): void {
  // Always emit statusChanged
  eventBus.emit("idea.statusChanged", {
    ideaId: result.ideaId,
    previousStatus: result.previousStatus,
    newStatus: result.newStatus,
    actorId: result.actorId,
    campaignId: ctx.idea.campaignId,
    timestamp: result.timestamp,
    reason: result.reason,
  });

  // Published when idea first becomes visible to community
  if (
    result.previousStatus === IdeaStatus.DRAFT &&
    result.newStatus === IdeaStatus.COMMUNITY_DISCUSSION
  ) {
    eventBus.emit("idea.published", {
      ideaId: result.ideaId,
      campaignId: ctx.idea.campaignId,
      contributorId: ctx.idea.contributorId,
      actorId: result.actorId,
      timestamp: result.timestamp,
    });
  }

  // Published when idea moves from qualification to community
  if (
    result.previousStatus === IdeaStatus.QUALIFICATION &&
    result.newStatus === IdeaStatus.COMMUNITY_DISCUSSION
  ) {
    eventBus.emit("idea.published", {
      ideaId: result.ideaId,
      campaignId: ctx.idea.campaignId,
      contributorId: ctx.idea.contributorId,
      actorId: result.actorId,
      timestamp: result.timestamp,
    });
  }

  // Archived
  if (result.newStatus === IdeaStatus.ARCHIVED && result.reason) {
    eventBus.emit("idea.archived", {
      ideaId: result.ideaId,
      previousStatus: result.previousStatus,
      reason: result.reason,
      actorId: result.actorId,
      timestamp: result.timestamp,
    });
  }

  // Coach qualification event
  if (
    result.previousStatus === IdeaStatus.QUALIFICATION &&
    result.coachFeedback
  ) {
    eventBus.emit("idea.coachQualification", {
      ideaId: result.ideaId,
      coachId: result.actorId,
      decision: result.coachFeedback.decision,
      feedback: result.coachFeedback.feedback,
      timestamp: result.timestamp,
    });
  }
}
