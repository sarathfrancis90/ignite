import type { CampaignStatus } from "@prisma/client";

/**
 * Campaign state machine transition map.
 * Status changes ONLY go through transitionCampaign() — never direct prisma.update({ status }).
 *
 * Flow: DRAFT → SEEDING → SUBMISSION → DISCUSSION_VOTING → EVALUATION → CLOSED
 * Some phases can be skipped based on campaign feature toggles.
 */

export interface CampaignFeatureToggles {
  hasSeedingPhase: boolean;
  hasDiscussionPhase: boolean;
}

/**
 * Guard identifiers for transition preconditions.
 * Guards are checked asynchronously before a transition is allowed.
 */
export type TransitionGuardId =
  | "SEEDING_TEAM_ASSIGNED"
  | "HAS_AT_LEAST_ONE_IDEA"
  | "ALL_EVALUATIONS_COMPLETE";

export interface TransitionGuardFailure {
  guard: TransitionGuardId;
  message: string;
}

/**
 * Map of transition pairs to required guards.
 * Key format: "FROM->TO"
 */
const TRANSITION_GUARDS: Record<string, TransitionGuardId[]> = {
  "DRAFT->SEEDING": ["SEEDING_TEAM_ASSIGNED"],
  "SUBMISSION->DISCUSSION_VOTING": ["HAS_AT_LEAST_ONE_IDEA"],
  "SUBMISSION->EVALUATION": ["HAS_AT_LEAST_ONE_IDEA"],
  "EVALUATION->CLOSED": ["ALL_EVALUATIONS_COMPLETE"],
};

const TRANSITION_MAP: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["SEEDING", "SUBMISSION"],
  SEEDING: ["SUBMISSION"],
  SUBMISSION: ["DISCUSSION_VOTING", "EVALUATION"],
  DISCUSSION_VOTING: ["EVALUATION"],
  EVALUATION: ["CLOSED"],
  CLOSED: [],
};

/**
 * Ordered list of all campaign phases for display purposes.
 */
export const CAMPAIGN_PHASE_ORDER: CampaignStatus[] = [
  "DRAFT",
  "SEEDING",
  "SUBMISSION",
  "DISCUSSION_VOTING",
  "EVALUATION",
  "CLOSED",
];

/**
 * Get valid next statuses for a campaign given its current status and feature toggles.
 */
export function getValidTransitions(
  currentStatus: CampaignStatus,
  toggles: CampaignFeatureToggles,
): CampaignStatus[] {
  const rawTransitions = TRANSITION_MAP[currentStatus] ?? [];

  return rawTransitions.filter((target) => {
    if (target === "SEEDING" && !toggles.hasSeedingPhase) return false;
    if (target === "DISCUSSION_VOTING" && !toggles.hasDiscussionPhase) return false;
    return true;
  });
}

/**
 * Check if a transition from currentStatus to targetStatus is valid.
 */
export function isValidTransition(
  currentStatus: CampaignStatus,
  targetStatus: CampaignStatus,
  toggles: CampaignFeatureToggles,
): boolean {
  const validTargets = getValidTransitions(currentStatus, toggles);
  return validTargets.includes(targetStatus);
}

/**
 * Get the guards required for a specific transition.
 */
export function getTransitionGuards(from: CampaignStatus, to: CampaignStatus): TransitionGuardId[] {
  const key = `${from}->${to}`;
  return TRANSITION_GUARDS[key] ?? [];
}

/**
 * Human-readable labels for each campaign status.
 */
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SEEDING: "Seeding",
  SUBMISSION: "Submission",
  DISCUSSION_VOTING: "Discussion & Voting",
  EVALUATION: "Evaluation",
  CLOSED: "Closed",
};

/**
 * Human-readable messages for guard failures.
 */
export const GUARD_FAILURE_MESSAGES: Record<TransitionGuardId, string> = {
  SEEDING_TEAM_ASSIGNED: "A seeding team must be assigned before entering the Seeding phase",
  HAS_AT_LEAST_ONE_IDEA: "At least one idea must be submitted before advancing",
  ALL_EVALUATIONS_COMPLETE: "All evaluation sessions must be completed before closing the campaign",
};
