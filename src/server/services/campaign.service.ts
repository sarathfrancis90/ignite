import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { isValidTransition } from "@/server/lib/state-machines/campaign-transitions";
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

export class CampaignServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CampaignServiceError";
  }
}
