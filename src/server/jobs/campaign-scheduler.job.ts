import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { transitionCampaign, CampaignServiceError } from "@/server/services/campaign.service";

const childLogger = logger.child({ service: "campaign-scheduler" });

const SYSTEM_ACTOR = "system:campaign-scheduler";

/**
 * Check campaigns for scheduled auto-transitions based on close dates.
 *
 * Rules:
 * - submissionCloseDate reached → advance from SUBMISSION to next phase
 * - votingCloseDate reached → advance from DISCUSSION_VOTING to EVALUATION
 * - plannedCloseDate reached → advance from EVALUATION to CLOSED
 *
 * This function is designed to be called on a cron schedule (e.g., every 5 minutes).
 * When BullMQ is available, wrap this in a repeatable job processor.
 */
export async function checkScheduledTransitions(): Promise<number> {
  const now = new Date();
  let transitioned = 0;

  // 1. Campaigns in SUBMISSION past submissionCloseDate
  const submissionCampaigns = await prisma.campaign.findMany({
    where: {
      status: "SUBMISSION",
      submissionCloseDate: { lte: now },
    },
    select: {
      id: true,
      title: true,
      hasDiscussionPhase: true,
    },
  });

  for (const campaign of submissionCampaigns) {
    const nextStatus = campaign.hasDiscussionPhase ? "DISCUSSION_VOTING" : "EVALUATION";
    const success = await tryAutoTransition(campaign.id, campaign.title, nextStatus);
    if (success) transitioned++;
  }

  // 2. Campaigns in DISCUSSION_VOTING past votingCloseDate
  const votingCampaigns = await prisma.campaign.findMany({
    where: {
      status: "DISCUSSION_VOTING",
      votingCloseDate: { lte: now },
    },
    select: { id: true, title: true },
  });

  for (const campaign of votingCampaigns) {
    const success = await tryAutoTransition(campaign.id, campaign.title, "EVALUATION");
    if (success) transitioned++;
  }

  // 3. Campaigns in EVALUATION past plannedCloseDate
  const evaluationCampaigns = await prisma.campaign.findMany({
    where: {
      status: "EVALUATION",
      plannedCloseDate: { lte: now },
    },
    select: { id: true, title: true },
  });

  for (const campaign of evaluationCampaigns) {
    const success = await tryAutoTransition(campaign.id, campaign.title, "CLOSED");
    if (success) transitioned++;
  }

  if (transitioned > 0) {
    childLogger.info({ transitioned }, "Scheduled transitions completed");
  }

  return transitioned;
}

async function tryAutoTransition(
  campaignId: string,
  title: string,
  targetStatus: "DISCUSSION_VOTING" | "EVALUATION" | "CLOSED",
): Promise<boolean> {
  try {
    await transitionCampaign(campaignId, targetStatus, SYSTEM_ACTOR);
    childLogger.info({ campaignId, title, targetStatus }, "Auto-transition succeeded");
    return true;
  } catch (error) {
    if (error instanceof CampaignServiceError) {
      childLogger.warn(
        { campaignId, title, targetStatus, code: error.code, message: error.message },
        "Auto-transition skipped due to guard failure",
      );
    } else {
      childLogger.error(
        { campaignId, title, targetStatus, error },
        "Auto-transition failed unexpectedly",
      );
    }
    return false;
  }
}
