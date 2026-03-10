import type { EventName } from "@/types/events";

export const IdeaStatus = {
  DRAFT: "DRAFT",
  QUALIFICATION: "QUALIFICATION",
  COMMUNITY_DISCUSSION: "COMMUNITY_DISCUSSION",
  HOT: "HOT",
  EVALUATION: "EVALUATION",
  SELECTED_CONCEPT: "SELECTED_CONCEPT",
  SELECTED_IMPLEMENTATION: "SELECTED_IMPLEMENTATION",
  IMPLEMENTED: "IMPLEMENTED",
  IMPLEMENTATION_CANCELED: "IMPLEMENTATION_CANCELED",
  ARCHIVED: "ARCHIVED",
} as const;

export type IdeaStatusType = (typeof IdeaStatus)[keyof typeof IdeaStatus];

export interface TransitionDef {
  to: IdeaStatusType;
  guard?: (context: TransitionContext) => Promise<boolean>;
  effects: EventName[];
}

export interface TransitionContext {
  ideaId: string;
  actorId: string;
  campaignStatus?: string;
  ideaStatus: IdeaStatusType;
  metadata?: Record<string, unknown>;
}

const campaignPhaseOrder: Record<string, number> = {
  DRAFT: 0,
  SEEDING: 1,
  SUBMISSION: 2,
  DISCUSSION_VOTING: 3,
  EVALUATION: 4,
  CLOSED: 5,
};

const ideaStatusToCampaignCeiling: Partial<Record<IdeaStatusType, string>> = {
  COMMUNITY_DISCUSSION: "DISCUSSION_VOTING",
  HOT: "DISCUSSION_VOTING",
  EVALUATION: "EVALUATION",
};

async function guardCampaignCeiling(
  context: TransitionContext,
  targetStatus: IdeaStatusType,
): Promise<boolean> {
  const requiredCampaignPhase = ideaStatusToCampaignCeiling[targetStatus];
  if (!requiredCampaignPhase || !context.campaignStatus) return true;

  const campaignOrder = campaignPhaseOrder[context.campaignStatus] ?? 0;
  const requiredOrder = campaignPhaseOrder[requiredCampaignPhase] ?? 0;
  return campaignOrder >= requiredOrder;
}

export const ideaTransitions: Record<IdeaStatusType, TransitionDef[]> = {
  DRAFT: [
    {
      to: IdeaStatus.QUALIFICATION,
      guard: (ctx) => guardCampaignCeiling(ctx, IdeaStatus.QUALIFICATION),
      effects: ["idea.submitted", "idea.statusChanged"],
    },
    {
      to: IdeaStatus.COMMUNITY_DISCUSSION,
      guard: (ctx) =>
        guardCampaignCeiling(ctx, IdeaStatus.COMMUNITY_DISCUSSION),
      effects: ["idea.submitted", "idea.statusChanged"],
    },
  ],
  QUALIFICATION: [
    {
      to: IdeaStatus.COMMUNITY_DISCUSSION,
      guard: (ctx) =>
        guardCampaignCeiling(ctx, IdeaStatus.COMMUNITY_DISCUSSION),
      effects: ["idea.published", "idea.statusChanged"],
    },
    {
      to: IdeaStatus.ARCHIVED,
      effects: ["idea.archived", "idea.statusChanged"],
    },
  ],
  COMMUNITY_DISCUSSION: [
    {
      to: IdeaStatus.HOT,
      guard: (ctx) => guardCampaignCeiling(ctx, IdeaStatus.HOT),
      effects: ["idea.graduated", "idea.statusChanged"],
    },
    {
      to: IdeaStatus.EVALUATION,
      guard: (ctx) => guardCampaignCeiling(ctx, IdeaStatus.EVALUATION),
      effects: ["idea.statusChanged"],
    },
    {
      to: IdeaStatus.ARCHIVED,
      effects: ["idea.archived", "idea.statusChanged"],
    },
  ],
  HOT: [
    {
      to: IdeaStatus.EVALUATION,
      guard: (ctx) => guardCampaignCeiling(ctx, IdeaStatus.EVALUATION),
      effects: ["idea.statusChanged"],
    },
    {
      to: IdeaStatus.ARCHIVED,
      effects: ["idea.archived", "idea.statusChanged"],
    },
  ],
  EVALUATION: [
    {
      to: IdeaStatus.SELECTED_CONCEPT,
      effects: ["idea.statusChanged"],
    },
    {
      to: IdeaStatus.SELECTED_IMPLEMENTATION,
      effects: ["idea.statusChanged"],
    },
    {
      to: IdeaStatus.ARCHIVED,
      effects: ["idea.archived", "idea.statusChanged"],
    },
  ],
  SELECTED_CONCEPT: [
    {
      to: IdeaStatus.ARCHIVED,
      effects: ["idea.archived", "idea.statusChanged"],
    },
  ],
  SELECTED_IMPLEMENTATION: [
    {
      to: IdeaStatus.IMPLEMENTED,
      effects: ["idea.statusChanged"],
    },
    {
      to: IdeaStatus.IMPLEMENTATION_CANCELED,
      effects: ["idea.statusChanged"],
    },
    {
      to: IdeaStatus.ARCHIVED,
      effects: ["idea.archived", "idea.statusChanged"],
    },
  ],
  IMPLEMENTED: [],
  IMPLEMENTATION_CANCELED: [
    {
      to: IdeaStatus.ARCHIVED,
      effects: ["idea.archived", "idea.statusChanged"],
    },
  ],
  ARCHIVED: [
    {
      to: IdeaStatus.COMMUNITY_DISCUSSION,
      effects: ["idea.unarchived", "idea.statusChanged"],
    },
    {
      to: IdeaStatus.HOT,
      effects: ["idea.unarchived", "idea.statusChanged"],
    },
  ],
};

export function getValidTransitions(
  currentStatus: IdeaStatusType,
): TransitionDef[] {
  return ideaTransitions[currentStatus] ?? [];
}

export function findTransition(
  currentStatus: IdeaStatusType,
  targetStatus: IdeaStatusType,
): TransitionDef | undefined {
  const transitions = getValidTransitions(currentStatus);
  return transitions.find((t) => t.to === targetStatus);
}

export async function validateTransition(
  currentStatus: IdeaStatusType,
  targetStatus: IdeaStatusType,
  context: TransitionContext,
): Promise<{ valid: boolean; reason?: string }> {
  const transition = findTransition(currentStatus, targetStatus);
  if (!transition) {
    return {
      valid: false,
      reason: `Invalid transition from ${currentStatus} to ${targetStatus}`,
    };
  }

  if (transition.guard) {
    const allowed = await transition.guard(context);
    if (!allowed) {
      return {
        valid: false,
        reason: `Guard rejected transition from ${currentStatus} to ${targetStatus}`,
      };
    }
  }

  return { valid: true };
}
