import type { CampaignStatus } from "@prisma/client";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import {
  type TransitionGuardId,
  type TransitionGuardFailure,
  getTransitionGuards,
  GUARD_FAILURE_MESSAGES,
} from "./campaign-transitions";

const childLogger = logger.child({ service: "transition-engine" });

/**
 * Evaluate all guards for a campaign transition.
 * Returns an array of failures — empty means all guards pass.
 */
export async function evaluateTransitionGuards(
  campaignId: string,
  from: CampaignStatus,
  to: CampaignStatus,
): Promise<TransitionGuardFailure[]> {
  const guardIds = getTransitionGuards(from, to);

  if (guardIds.length === 0) {
    return [];
  }

  const failures: TransitionGuardFailure[] = [];

  for (const guardId of guardIds) {
    const passed = await checkGuard(campaignId, guardId);
    if (!passed) {
      failures.push({
        guard: guardId,
        message: GUARD_FAILURE_MESSAGES[guardId],
      });
    }
  }

  if (failures.length > 0) {
    childLogger.info(
      { campaignId, from, to, failures: failures.map((f) => f.guard) },
      "Transition guards failed",
    );
  }

  return failures;
}

async function checkGuard(campaignId: string, guardId: TransitionGuardId): Promise<boolean> {
  switch (guardId) {
    case "SEEDING_TEAM_ASSIGNED":
      return checkSeedingTeamAssigned(campaignId);
    case "HAS_AT_LEAST_ONE_IDEA":
      // Idea model not yet implemented (Story 3.x) — guard passes by default
      return true;
    case "ALL_EVALUATIONS_COMPLETE":
      // EvaluationSession model not yet implemented (Story 5.x) — guard passes by default
      return true;
    default: {
      const _exhaustive: never = guardId;
      childLogger.warn({ guardId: _exhaustive }, "Unknown guard ID");
      return false;
    }
  }
}

async function checkSeedingTeamAssigned(campaignId: string): Promise<boolean> {
  const seeders = await prisma.campaignMember.count({
    where: {
      campaignId,
      role: "CAMPAIGN_SEEDER",
    },
  });
  return seeders > 0;
}
