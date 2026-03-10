import type { IdeaStatus, CampaignStatus } from "@prisma/client";

/**
 * Idea state machine transition map.
 * Status changes ONLY go through transitionIdea() — never direct prisma.update({ status }).
 *
 * Flow: DRAFT → QUALIFICATION → COMMUNITY_DISCUSSION → HOT → EVALUATION → SELECTED_IMPLEMENTATION → IMPLEMENTED → ARCHIVED
 * Some phases can be skipped based on campaign feature toggles.
 */

export interface IdeaFeatureToggles {
  hasQualificationPhase: boolean;
  hasDiscussionPhase: boolean;
  hasCommunityGraduation: boolean;
  hasIdeaCoach: boolean;
}

/**
 * Guard identifiers for idea transition preconditions.
 */
export type IdeaTransitionGuardId =
  | "COACH_QUALIFIED"
  | "CAMPAIGN_IN_DISCUSSION_OR_LATER"
  | "MEETS_GRADUATION_THRESHOLDS"
  | "CAMPAIGN_IN_EVALUATION_OR_LATER";

export interface IdeaTransitionGuardFailure {
  guard: IdeaTransitionGuardId;
  message: string;
}

/**
 * Map of transition pairs to required guards.
 * Key format: "FROM->TO"
 */
const IDEA_TRANSITION_GUARDS: Record<string, IdeaTransitionGuardId[]> = {
  "QUALIFICATION->COMMUNITY_DISCUSSION": ["COACH_QUALIFIED"],
  "QUALIFICATION->HOT": ["COACH_QUALIFIED"],
  "COMMUNITY_DISCUSSION->HOT": ["MEETS_GRADUATION_THRESHOLDS"],
  "HOT->EVALUATION": ["CAMPAIGN_IN_EVALUATION_OR_LATER"],
};

/**
 * The full transition map for idea statuses.
 * Innovation Managers can also manually advance/archive ideas.
 */
const IDEA_TRANSITION_MAP: Record<IdeaStatus, IdeaStatus[]> = {
  DRAFT: ["QUALIFICATION"],
  QUALIFICATION: ["COMMUNITY_DISCUSSION", "HOT", "ARCHIVED"],
  COMMUNITY_DISCUSSION: ["HOT", "ARCHIVED"],
  HOT: ["EVALUATION", "ARCHIVED"],
  EVALUATION: ["SELECTED_IMPLEMENTATION", "ARCHIVED"],
  SELECTED_IMPLEMENTATION: ["IMPLEMENTED", "ARCHIVED"],
  IMPLEMENTED: ["ARCHIVED"],
  ARCHIVED: [],
};

/**
 * Ordered list of idea lifecycle phases for display purposes.
 */
export const IDEA_PHASE_ORDER: IdeaStatus[] = [
  "DRAFT",
  "QUALIFICATION",
  "COMMUNITY_DISCUSSION",
  "HOT",
  "EVALUATION",
  "SELECTED_IMPLEMENTATION",
  "IMPLEMENTED",
  "ARCHIVED",
];

/**
 * Campaign phases that allow idea submission.
 */
export const CAMPAIGN_SUBMITTABLE_STATUSES: CampaignStatus[] = ["SEEDING", "SUBMISSION"];

/**
 * Mapping of campaign phases to the maximum idea status allowed.
 * Ideas cannot advance past their campaign's current phase limit.
 */
const CAMPAIGN_PHASE_IDEA_CEILING: Record<CampaignStatus, IdeaStatus[]> = {
  DRAFT: ["DRAFT"],
  SEEDING: ["DRAFT", "QUALIFICATION"],
  SUBMISSION: ["DRAFT", "QUALIFICATION", "COMMUNITY_DISCUSSION"],
  DISCUSSION_VOTING: ["DRAFT", "QUALIFICATION", "COMMUNITY_DISCUSSION", "HOT"],
  EVALUATION: [
    "DRAFT",
    "QUALIFICATION",
    "COMMUNITY_DISCUSSION",
    "HOT",
    "EVALUATION",
    "SELECTED_IMPLEMENTATION",
  ],
  CLOSED: [
    "DRAFT",
    "QUALIFICATION",
    "COMMUNITY_DISCUSSION",
    "HOT",
    "EVALUATION",
    "SELECTED_IMPLEMENTATION",
    "IMPLEMENTED",
    "ARCHIVED",
  ],
};

/**
 * Get valid next statuses for an idea given its current status and feature toggles.
 */
export function getValidIdeaTransitions(
  currentStatus: IdeaStatus,
  toggles: IdeaFeatureToggles,
  campaignStatus: CampaignStatus,
): IdeaStatus[] {
  const rawTransitions = IDEA_TRANSITION_MAP[currentStatus] ?? [];
  const allowedByPhase = CAMPAIGN_PHASE_IDEA_CEILING[campaignStatus] ?? [];

  return rawTransitions.filter((target) => {
    // ARCHIVED is always allowed from any non-DRAFT state
    if (target === "ARCHIVED") return true;

    // Skip qualification if campaign doesn't have it
    if (target === "COMMUNITY_DISCUSSION" && !toggles.hasDiscussionPhase) return false;

    // If no discussion phase, skip COMMUNITY_DISCUSSION
    if (target === "COMMUNITY_DISCUSSION" && !toggles.hasDiscussionPhase) return false;

    // Check campaign phase ceiling
    if (!allowedByPhase.includes(target)) return false;

    return true;
  });
}

/**
 * Check if a transition from currentStatus to targetStatus is valid.
 */
export function isValidIdeaTransition(
  currentStatus: IdeaStatus,
  targetStatus: IdeaStatus,
  toggles: IdeaFeatureToggles,
  campaignStatus: CampaignStatus,
): boolean {
  const validTargets = getValidIdeaTransitions(currentStatus, toggles, campaignStatus);
  return validTargets.includes(targetStatus);
}

/**
 * Get the guards required for a specific idea transition.
 */
export function getIdeaTransitionGuards(from: IdeaStatus, to: IdeaStatus): IdeaTransitionGuardId[] {
  const key = `${from}->${to}`;
  return IDEA_TRANSITION_GUARDS[key] ?? [];
}

/**
 * Check if an idea can be unarchived (restored to previous status).
 */
export function canUnarchive(currentStatus: IdeaStatus): boolean {
  return currentStatus === "ARCHIVED";
}

/**
 * Human-readable labels for each idea status.
 */
export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  DRAFT: "Draft",
  QUALIFICATION: "Qualification",
  COMMUNITY_DISCUSSION: "Community Discussion",
  HOT: "Hot",
  EVALUATION: "Evaluation",
  SELECTED_IMPLEMENTATION: "Selected for Implementation",
  IMPLEMENTED: "Implemented",
  ARCHIVED: "Archived",
};

/**
 * Human-readable messages for idea guard failures.
 */
export const IDEA_GUARD_FAILURE_MESSAGES: Record<IdeaTransitionGuardId, string> = {
  COACH_QUALIFIED: "A coach must approve this idea before it can advance from Qualification",
  CAMPAIGN_IN_DISCUSSION_OR_LATER:
    "The campaign must be in Discussion & Voting phase or later for this transition",
  MEETS_GRADUATION_THRESHOLDS:
    "The idea must meet community graduation thresholds (views, comments, likes) to become Hot",
  CAMPAIGN_IN_EVALUATION_OR_LATER:
    "The campaign must be in Evaluation phase or later for this transition",
};
