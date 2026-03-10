import type { CampaignStatus } from "@prisma/client";

/**
 * Campaign state machine transition map.
 * Status changes ONLY go through transitionCampaign() — never direct prisma.update({ status }).
 *
 * Flow: DRAFT → SEEDING → SUBMISSION → DISCUSSION_VOTING → EVALUATION → CLOSED
 * Some phases can be skipped based on campaign feature toggles.
 */

interface CampaignFeatureToggles {
  hasSeedingPhase: boolean;
  hasDiscussionPhase: boolean;
}

const TRANSITION_MAP: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["SEEDING", "SUBMISSION"],
  SEEDING: ["SUBMISSION"],
  SUBMISSION: ["DISCUSSION_VOTING", "EVALUATION"],
  DISCUSSION_VOTING: ["EVALUATION"],
  EVALUATION: ["CLOSED"],
  CLOSED: [],
};

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
