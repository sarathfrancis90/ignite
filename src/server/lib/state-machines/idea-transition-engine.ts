import type { IdeaStatus, CampaignStatus } from "@prisma/client";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import {
  type IdeaTransitionGuardId,
  type IdeaTransitionGuardFailure,
  getIdeaTransitionGuards,
  IDEA_GUARD_FAILURE_MESSAGES,
} from "./idea-transitions";

const childLogger = logger.child({ service: "idea-transition-engine" });

/**
 * Evaluate all guards for an idea transition.
 * Returns an array of failures — empty means all guards pass.
 */
export async function evaluateIdeaTransitionGuards(
  ideaId: string,
  campaignId: string,
  from: IdeaStatus,
  to: IdeaStatus,
): Promise<IdeaTransitionGuardFailure[]> {
  const guardIds = getIdeaTransitionGuards(from, to);

  if (guardIds.length === 0) {
    return [];
  }

  const failures: IdeaTransitionGuardFailure[] = [];

  for (const guardId of guardIds) {
    const passed = await checkIdeaGuard(ideaId, campaignId, guardId);
    if (!passed) {
      failures.push({
        guard: guardId,
        message: IDEA_GUARD_FAILURE_MESSAGES[guardId],
      });
    }
  }

  if (failures.length > 0) {
    childLogger.info(
      { ideaId, from, to, failures: failures.map((f) => f.guard) },
      "Idea transition guards failed",
    );
  }

  return failures;
}

async function checkIdeaGuard(
  ideaId: string,
  campaignId: string,
  guardId: IdeaTransitionGuardId,
): Promise<boolean> {
  switch (guardId) {
    case "COACH_QUALIFIED":
      return checkCoachQualified(ideaId);
    case "CAMPAIGN_IN_DISCUSSION_OR_LATER":
      return checkCampaignPhase(campaignId, ["DISCUSSION_VOTING", "EVALUATION", "CLOSED"]);
    case "MEETS_GRADUATION_THRESHOLDS":
      return checkGraduationThresholds(ideaId, campaignId);
    case "CAMPAIGN_IN_EVALUATION_OR_LATER":
      return checkCampaignPhase(campaignId, ["EVALUATION", "CLOSED"]);
    default: {
      const _exhaustive: never = guardId;
      childLogger.warn({ guardId: _exhaustive }, "Unknown idea guard ID");
      return false;
    }
  }
}

async function checkCoachQualified(ideaId: string): Promise<boolean> {
  const approvalCount = await prisma.coachQualification.count({
    where: {
      ideaId,
      decision: "APPROVED",
    },
  });
  return approvalCount > 0;
}

async function checkCampaignPhase(
  campaignId: string,
  allowedStatuses: CampaignStatus[],
): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });
  if (!campaign) return false;
  return allowedStatuses.includes(campaign.status);
}

async function checkGraduationThresholds(ideaId: string, campaignId: string): Promise<boolean> {
  const [idea, campaign] = await Promise.all([
    prisma.idea.findUnique({
      where: { id: ideaId },
      select: { viewsCount: true, commentsCount: true, likesCount: true },
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        graduationVisitors: true,
        graduationCommenters: true,
        graduationLikes: true,
      },
    }),
  ]);

  if (!idea || !campaign) return false;

  return (
    idea.viewsCount >= campaign.graduationVisitors &&
    idea.commentsCount >= campaign.graduationCommenters &&
    idea.likesCount >= campaign.graduationLikes
  );
}
