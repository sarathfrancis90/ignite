import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import {
  isValidTransition,
  getValidTransitions,
  CAMPAIGN_STATUS_LABELS,
} from "@/server/lib/state-machines/campaign-transitions";
import { evaluateTransitionGuards } from "@/server/lib/state-machines/transition-engine";
import type { CampaignStatus, Prisma } from "@prisma/client";
import type {
  CampaignCreateInput,
  CampaignUpdateInput,
  CampaignListInput,
} from "./campaign.schemas";

export {
  campaignCreateInput,
  campaignUpdateInput,
  campaignListInput,
  campaignGetByIdInput,
  campaignTransitionInput,
  campaignGetTransitionsInput,
  campaignRevertInput,
} from "./campaign.schemas";

export type {
  CampaignCreateInput,
  CampaignUpdateInput,
  CampaignListInput,
  CampaignTransitionInput,
} from "./campaign.schemas";

const childLogger = logger.child({ service: "campaign" });

/**
 * List campaigns with cursor-based pagination and optional filters.
 */
export async function listCampaigns(input: CampaignListInput) {
  const where: Prisma.CampaignWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { teaser: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.campaign.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((c) => ({
      id: c.id,
      title: c.title,
      teaser: c.teaser,
      bannerUrl: c.bannerUrl,
      status: c.status,
      submissionType: c.submissionType,
      submissionCloseDate: c.submissionCloseDate?.toISOString() ?? null,
      votingCloseDate: c.votingCloseDate?.toISOString() ?? null,
      plannedCloseDate: c.plannedCloseDate?.toISOString() ?? null,
      launchedAt: c.launchedAt?.toISOString() ?? null,
      isFeatured: c.isFeatured,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

/**
 * Get a single campaign by ID with full details.
 */
export async function getCampaignById(id: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (!campaign) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  return {
    ...campaign,
    submissionCloseDate: campaign.submissionCloseDate?.toISOString() ?? null,
    votingCloseDate: campaign.votingCloseDate?.toISOString() ?? null,
    plannedCloseDate: campaign.plannedCloseDate?.toISOString() ?? null,
    launchedAt: campaign.launchedAt?.toISOString() ?? null,
    closedAt: campaign.closedAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

/**
 * Create a new campaign in DRAFT status (Simple Setup).
 */
export async function createCampaign(input: CampaignCreateInput, createdById: string) {
  const campaign = await prisma.campaign.create({
    data: {
      title: input.title,
      description: input.description,
      teaser: input.teaser,
      submissionCloseDate: input.submissionCloseDate
        ? new Date(input.submissionCloseDate)
        : undefined,
      votingCloseDate: input.votingCloseDate ? new Date(input.votingCloseDate) : undefined,
      plannedCloseDate: input.plannedCloseDate ? new Date(input.plannedCloseDate) : undefined,
      status: "DRAFT",
      setupType: "SIMPLE",
      createdById,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("campaign.created", {
    entity: "campaign",
    entityId: campaign.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: { title: campaign.title, status: campaign.status },
  });

  childLogger.info({ campaignId: campaign.id, title: campaign.title }, "Campaign created");

  return {
    ...campaign,
    submissionCloseDate: campaign.submissionCloseDate?.toISOString() ?? null,
    votingCloseDate: campaign.votingCloseDate?.toISOString() ?? null,
    plannedCloseDate: campaign.plannedCloseDate?.toISOString() ?? null,
    launchedAt: campaign.launchedAt?.toISOString() ?? null,
    closedAt: campaign.closedAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

/**
 * Update a campaign. Only allowed in DRAFT status for most fields.
 */
export async function updateCampaign(input: CampaignUpdateInput, updatedById: string) {
  const existing = await prisma.campaign.findUnique({
    where: { id: input.id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const { id, ...updateData } = input;

  // Convert date strings to Date objects
  const data: Prisma.CampaignUpdateInput = {};

  if (updateData.title !== undefined) data.title = updateData.title;
  if (updateData.description !== undefined) data.description = updateData.description;
  if (updateData.teaser !== undefined) data.teaser = updateData.teaser;
  if (updateData.bannerUrl !== undefined) data.bannerUrl = updateData.bannerUrl;
  if (updateData.videoUrl !== undefined) data.videoUrl = updateData.videoUrl;
  if (updateData.submissionCloseDate !== undefined) {
    data.submissionCloseDate = updateData.submissionCloseDate
      ? new Date(updateData.submissionCloseDate)
      : null;
  }
  if (updateData.votingCloseDate !== undefined) {
    data.votingCloseDate = updateData.votingCloseDate ? new Date(updateData.votingCloseDate) : null;
  }
  if (updateData.plannedCloseDate !== undefined) {
    data.plannedCloseDate = updateData.plannedCloseDate
      ? new Date(updateData.plannedCloseDate)
      : null;
  }
  if (updateData.hasSeedingPhase !== undefined) data.hasSeedingPhase = updateData.hasSeedingPhase;
  if (updateData.hasDiscussionPhase !== undefined)
    data.hasDiscussionPhase = updateData.hasDiscussionPhase;
  if (updateData.hasCommunityGraduation !== undefined)
    data.hasCommunityGraduation = updateData.hasCommunityGraduation;
  if (updateData.hasVoting !== undefined) data.hasVoting = updateData.hasVoting;
  if (updateData.hasLikes !== undefined) data.hasLikes = updateData.hasLikes;
  if (updateData.isConfidentialAllowed !== undefined)
    data.isConfidentialAllowed = updateData.isConfidentialAllowed;
  if (updateData.isFeatured !== undefined) data.isFeatured = updateData.isFeatured;
  if (updateData.isShowOnStartPage !== undefined)
    data.isShowOnStartPage = updateData.isShowOnStartPage;
  if (updateData.hasIdeaCoach !== undefined) data.hasIdeaCoach = updateData.hasIdeaCoach;
  if (updateData.hasQualificationPhase !== undefined)
    data.hasQualificationPhase = updateData.hasQualificationPhase;
  if (updateData.coachAssignmentMode !== undefined)
    data.coachAssignmentMode = updateData.coachAssignmentMode;
  if (updateData.ideaCategories !== undefined)
    data.ideaCategories = updateData.ideaCategories as Prisma.InputJsonValue;
  if (updateData.audienceType !== undefined) data.audienceType = updateData.audienceType;
  if (updateData.graduationVisitors !== undefined)
    data.graduationVisitors = updateData.graduationVisitors;
  if (updateData.graduationCommenters !== undefined)
    data.graduationCommenters = updateData.graduationCommenters;
  if (updateData.graduationLikes !== undefined) data.graduationLikes = updateData.graduationLikes;
  if (updateData.graduationVoters !== undefined)
    data.graduationVoters = updateData.graduationVoters;
  if (updateData.graduationVotingLevel !== undefined)
    data.graduationVotingLevel = updateData.graduationVotingLevel;
  if (updateData.graduationDaysInStatus !== undefined)
    data.graduationDaysInStatus = updateData.graduationDaysInStatus;
  if (updateData.votingCriteria !== undefined)
    data.votingCriteria = updateData.votingCriteria as Prisma.InputJsonValue;
  if (updateData.customFields !== undefined)
    data.customFields = updateData.customFields as Prisma.InputJsonValue;
  if (updateData.settings !== undefined)
    data.settings = updateData.settings as Prisma.InputJsonValue;

  const campaign = await prisma.campaign.update({
    where: { id },
    data,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("campaign.updated", {
    entity: "campaign",
    entityId: campaign.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(updateData) },
  });

  childLogger.info({ campaignId: campaign.id }, "Campaign updated");

  return {
    ...campaign,
    submissionCloseDate: campaign.submissionCloseDate?.toISOString() ?? null,
    votingCloseDate: campaign.votingCloseDate?.toISOString() ?? null,
    plannedCloseDate: campaign.plannedCloseDate?.toISOString() ?? null,
    launchedAt: campaign.launchedAt?.toISOString() ?? null,
    closedAt: campaign.closedAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

/**
 * Get valid transitions for a campaign, including guard status for each.
 */
export async function getCampaignTransitions(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      previousStatus: true,
      hasSeedingPhase: true,
      hasDiscussionPhase: true,
    },
  });

  if (!campaign) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const toggles = {
    hasSeedingPhase: campaign.hasSeedingPhase,
    hasDiscussionPhase: campaign.hasDiscussionPhase,
  };

  const validTargets = getValidTransitions(campaign.status, toggles);

  const transitions = await Promise.all(
    validTargets.map(async (target) => {
      const guardFailures = await evaluateTransitionGuards(campaign.id, campaign.status, target);
      return {
        targetStatus: target,
        label: CAMPAIGN_STATUS_LABELS[target],
        guardsPass: guardFailures.length === 0,
        guardFailures: guardFailures.map((f) => ({
          guard: f.guard,
          message: f.message,
        })),
      };
    }),
  );

  return {
    currentStatus: campaign.status,
    currentLabel: CAMPAIGN_STATUS_LABELS[campaign.status],
    previousStatus: campaign.previousStatus,
    canRevert: campaign.previousStatus !== null,
    transitions,
  };
}

/**
 * Transition a campaign to a new status using the state machine.
 * Status changes ONLY happen through this function.
 */
export async function transitionCampaign(
  campaignId: string,
  targetStatus: CampaignStatus,
  actor: string,
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      hasSeedingPhase: true,
      hasDiscussionPhase: true,
    },
  });

  if (!campaign) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const valid = isValidTransition(campaign.status, targetStatus, {
    hasSeedingPhase: campaign.hasSeedingPhase,
    hasDiscussionPhase: campaign.hasDiscussionPhase,
  });

  if (!valid) {
    throw new CampaignServiceError(
      `Cannot transition from ${campaign.status} to ${targetStatus}`,
      "INVALID_TRANSITION",
    );
  }

  // Evaluate guards
  const guardFailures = await evaluateTransitionGuards(campaignId, campaign.status, targetStatus);
  if (guardFailures.length > 0) {
    const messages = guardFailures.map((f) => f.message).join("; ");
    throw new CampaignServiceError(`Transition blocked: ${messages}`, "GUARD_FAILED");
  }

  const now = new Date();
  const additionalData: Prisma.CampaignUpdateInput = {};

  if (targetStatus === "SUBMISSION" && !campaign.status.includes("SUBMISSION")) {
    additionalData.launchedAt = now;
  }
  if (targetStatus === "CLOSED") {
    additionalData.closedAt = now;
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      previousStatus: campaign.status,
      status: targetStatus,
      ...additionalData,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("campaign.phaseChanged", {
    entity: "campaign",
    entityId: campaignId,
    actor,
    timestamp: now.toISOString(),
    metadata: {
      previousStatus: campaign.status,
      newStatus: targetStatus,
    },
  });

  childLogger.info(
    { campaignId, from: campaign.status, to: targetStatus },
    "Campaign phase transitioned",
  );

  return {
    ...updated,
    submissionCloseDate: updated.submissionCloseDate?.toISOString() ?? null,
    votingCloseDate: updated.votingCloseDate?.toISOString() ?? null,
    plannedCloseDate: updated.plannedCloseDate?.toISOString() ?? null,
    launchedAt: updated.launchedAt?.toISOString() ?? null,
    closedAt: updated.closedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * Revert a campaign to its previous status (fast-track backward).
 * Only allowed when previousStatus is set.
 */
export async function revertCampaignPhase(campaignId: string, actor: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      previousStatus: true,
    },
  });

  if (!campaign) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  if (!campaign.previousStatus) {
    throw new CampaignServiceError("No previous status to revert to", "NO_PREVIOUS_STATUS");
  }

  const now = new Date();

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      previousStatus: campaign.status,
      status: campaign.previousStatus,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("campaign.phaseChanged", {
    entity: "campaign",
    entityId: campaignId,
    actor,
    timestamp: now.toISOString(),
    metadata: {
      previousStatus: campaign.status,
      newStatus: campaign.previousStatus,
      isRevert: true,
    },
  });

  childLogger.info(
    { campaignId, from: campaign.status, to: campaign.previousStatus },
    "Campaign phase reverted",
  );

  return {
    ...updated,
    submissionCloseDate: updated.submissionCloseDate?.toISOString() ?? null,
    votingCloseDate: updated.votingCloseDate?.toISOString() ?? null,
    plannedCloseDate: updated.plannedCloseDate?.toISOString() ?? null,
    launchedAt: updated.launchedAt?.toISOString() ?? null,
    closedAt: updated.closedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export class CampaignServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CampaignServiceError";
  }
}
