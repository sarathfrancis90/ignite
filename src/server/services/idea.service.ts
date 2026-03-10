import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma, IdeaStatus } from "@prisma/client";
import type {
  IdeaCreateInput,
  IdeaUpdateInput,
  IdeaListInput,
  IdeaTransitionInput,
  IdeaArchiveInput,
  CoachQualifyInput,
} from "./idea.schemas";
import {
  isValidIdeaTransition,
  getValidIdeaTransitions,
  canUnarchive,
  type IdeaFeatureToggles,
} from "@/server/lib/state-machines/idea-transitions";
import { evaluateIdeaTransitionGuards } from "@/server/lib/state-machines/idea-transition-engine";

export {
  ideaCreateInput,
  ideaUpdateInput,
  ideaListInput,
  ideaGetByIdInput,
  ideaSubmitInput,
  ideaDeleteInput,
  ideaTransitionInput,
  ideaArchiveInput,
  ideaUnarchiveInput,
  coachQualifyInput,
  ideaGetTransitionsInput,
} from "./idea.schemas";

export type {
  IdeaCreateInput,
  IdeaUpdateInput,
  IdeaListInput,
  IdeaTransitionInput,
  IdeaArchiveInput,
  IdeaUnarchiveInput,
  CoachQualifyInput,
} from "./idea.schemas";

const childLogger = logger.child({ service: "idea" });

function serializeIdea(idea: {
  id: string;
  title: string;
  teaser: string | null;
  description: string | null;
  status: IdeaStatus;
  previousStatus: IdeaStatus | null;
  campaignId: string;
  contributorId: string;
  category: string | null;
  tags: string[];
  customFieldValues: Prisma.JsonValue;
  attachments: Prisma.JsonValue;
  isConfidential: boolean;
  inventionDisclosure: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contributor?: { id: string; name: string | null; email: string; image: string | null };
  coAuthors?: Array<{
    id: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }>;
  campaign?: { id: string; title: string; status: string };
}) {
  return {
    id: idea.id,
    title: idea.title,
    teaser: idea.teaser,
    description: idea.description,
    status: idea.status,
    previousStatus: idea.previousStatus,
    campaignId: idea.campaignId,
    contributorId: idea.contributorId,
    category: idea.category,
    tags: idea.tags,
    customFieldValues: idea.customFieldValues,
    attachments: idea.attachments,
    isConfidential: idea.isConfidential,
    inventionDisclosure: idea.inventionDisclosure,
    likesCount: idea.likesCount,
    commentsCount: idea.commentsCount,
    viewsCount: idea.viewsCount,
    submittedAt: idea.submittedAt?.toISOString() ?? null,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
    contributor: idea.contributor,
    coAuthors: idea.coAuthors?.map((ca) => ca.user),
    campaign: idea.campaign,
  };
}

/**
 * List ideas for a campaign with cursor-based pagination and filters.
 */
export async function listIdeas(input: IdeaListInput) {
  const where: Prisma.IdeaWhereInput = {
    campaignId: input.campaignId,
  };

  if (input.status) {
    where.status = input.status;
  }

  if (input.tag) {
    where.tags = { has: input.tag };
  }

  if (input.category) {
    where.category = input.category;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { teaser: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.idea.findMany({
    where,
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
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
    items: items.map(serializeIdea),
    nextCursor,
  };
}

/**
 * Get a single idea by ID with full details.
 */
export async function getIdeaById(id: string) {
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      campaign: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  return serializeIdea(idea);
}

/**
 * Create a new idea in DRAFT or submitted status.
 */
export async function createIdea(input: IdeaCreateInput, contributorId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, status: true, title: true },
  });

  if (!campaign) {
    throw new IdeaServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const submittableStatuses = ["SEEDING", "SUBMISSION"];
  if (!submittableStatuses.includes(campaign.status) && input.submitImmediately) {
    throw new IdeaServiceError("Campaign is not accepting submissions", "CAMPAIGN_NOT_ACCEPTING");
  }

  const initialStatus = input.submitImmediately ? "QUALIFICATION" : "DRAFT";

  const idea = await prisma.$transaction(async (tx) => {
    const newIdea = await tx.idea.create({
      data: {
        title: input.title,
        teaser: input.teaser,
        description: input.description,
        status: initialStatus,
        campaignId: input.campaignId,
        contributorId,
        category: input.category,
        tags: input.tags ?? [],
        // customFieldValues and attachments will be added when custom field UI is built
        isConfidential: input.isConfidential ?? false,
        inventionDisclosure: input.inventionDisclosure ?? false,
        submittedAt: input.submitImmediately ? new Date() : undefined,
      },
      include: {
        contributor: {
          select: { id: true, name: true, email: true, image: true },
        },
        coAuthors: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        campaign: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (input.coAuthorIds && input.coAuthorIds.length > 0) {
      const filteredCoAuthors = input.coAuthorIds.filter((id) => id !== contributorId);
      if (filteredCoAuthors.length > 0) {
        await tx.ideaCoAuthor.createMany({
          data: filteredCoAuthors.map((userId) => ({
            ideaId: newIdea.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      const updatedIdea = await tx.idea.findUnique({
        where: { id: newIdea.id },
        include: {
          contributor: {
            select: { id: true, name: true, email: true, image: true },
          },
          coAuthors: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          campaign: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      return updatedIdea!;
    }

    return newIdea;
  });

  const eventName = input.submitImmediately ? "idea.submitted" : "idea.created";
  eventBus.emit(eventName, {
    entity: "idea",
    entityId: idea.id,
    actor: contributorId,
    timestamp: new Date().toISOString(),
    metadata: {
      title: idea.title,
      campaignId: idea.campaignId,
      status: idea.status,
    },
  });

  childLogger.info(
    { ideaId: idea.id, campaignId: idea.campaignId, status: idea.status },
    "Idea created",
  );

  return serializeIdea(idea);
}

/**
 * Update an idea. Only the contributor or co-authors can update in DRAFT status.
 */
export async function updateIdea(input: IdeaUpdateInput, updatedById: string) {
  const existing = await prisma.idea.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      status: true,
      contributorId: true,
      coAuthors: { select: { userId: true } },
    },
  });

  if (!existing) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const isContributor = existing.contributorId === updatedById;
  const isCoAuthor = existing.coAuthors.some((ca) => ca.userId === updatedById);
  if (!isContributor && !isCoAuthor) {
    throw new IdeaServiceError("You can only update your own ideas", "NOT_AUTHORIZED");
  }

  const { id, coAuthorIds, ...updateData } = input;

  const data: Prisma.IdeaUpdateInput = {};

  if (updateData.title !== undefined) data.title = updateData.title;
  if (updateData.teaser !== undefined) data.teaser = updateData.teaser;
  if (updateData.description !== undefined) data.description = updateData.description;
  if (updateData.category !== undefined) data.category = updateData.category;
  if (updateData.tags !== undefined) data.tags = updateData.tags;
  if (updateData.isConfidential !== undefined) data.isConfidential = updateData.isConfidential;
  if (updateData.inventionDisclosure !== undefined)
    data.inventionDisclosure = updateData.inventionDisclosure;

  const idea = await prisma.$transaction(async (tx) => {
    const updated = await tx.idea.update({
      where: { id },
      data,
      include: {
        contributor: {
          select: { id: true, name: true, email: true, image: true },
        },
        coAuthors: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        campaign: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (coAuthorIds !== undefined) {
      await tx.ideaCoAuthor.deleteMany({ where: { ideaId: id } });
      const filteredCoAuthors = coAuthorIds.filter((userId) => userId !== existing.contributorId);
      if (filteredCoAuthors.length > 0) {
        await tx.ideaCoAuthor.createMany({
          data: filteredCoAuthors.map((userId) => ({
            ideaId: id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.idea.findUnique({
        where: { id },
        include: {
          contributor: {
            select: { id: true, name: true, email: true, image: true },
          },
          coAuthors: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          campaign: {
            select: { id: true, title: true, status: true },
          },
        },
      });
    }

    return updated;
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found after update", "IDEA_NOT_FOUND");
  }

  eventBus.emit("idea.updated", {
    entity: "idea",
    entityId: idea.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(updateData) },
  });

  childLogger.info({ ideaId: idea.id }, "Idea updated");

  return serializeIdea(idea);
}

/**
 * Submit a draft idea (transition from DRAFT to QUALIFICATION).
 * Status changes ONLY happen through this function for submissions.
 */
export async function submitIdea(ideaId: string, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      status: true,
      campaignId: true,
      campaign: { select: { status: true } },
    },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.status !== "DRAFT") {
    throw new IdeaServiceError("Only draft ideas can be submitted", "INVALID_STATUS");
  }

  const submittableStatuses = ["SEEDING", "SUBMISSION"];
  if (!submittableStatuses.includes(idea.campaign.status)) {
    throw new IdeaServiceError("Campaign is not accepting submissions", "CAMPAIGN_NOT_ACCEPTING");
  }

  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: "QUALIFICATION",
      previousStatus: "DRAFT",
      submittedAt: new Date(),
    },
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      campaign: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  eventBus.emit("idea.submitted", {
    entity: "idea",
    entityId: ideaId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      previousStatus: "DRAFT",
      newStatus: "QUALIFICATION",
    },
  });

  childLogger.info({ ideaId, campaignId: idea.campaignId }, "Idea submitted");

  return serializeIdea(updated);
}

/**
 * Delete an idea. Only the contributor can delete their own idea.
 */
export async function deleteIdea(ideaId: string, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, contributorId: true, campaignId: true, title: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.contributorId !== actor) {
    throw new IdeaServiceError("You can only delete your own ideas", "NOT_AUTHORIZED");
  }

  await prisma.idea.delete({ where: { id: ideaId } });

  eventBus.emit("idea.deleted", {
    entity: "idea",
    entityId: ideaId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      title: idea.title,
    },
  });

  childLogger.info({ ideaId, campaignId: idea.campaignId }, "Idea deleted");

  return { id: ideaId };
}

/**
 * Standard includes for idea queries (reusable).
 */
const IDEA_INCLUDE = {
  contributor: {
    select: { id: true, name: true, email: true, image: true },
  },
  coAuthors: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  },
  campaign: {
    select: { id: true, title: true, status: true },
  },
} as const;

/**
 * Get campaign feature toggles needed for idea transition logic.
 */
async function getCampaignToggles(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      status: true,
      hasQualificationPhase: true,
      hasDiscussionPhase: true,
      hasCommunityGraduation: true,
      hasIdeaCoach: true,
    },
  });

  if (!campaign) {
    throw new IdeaServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const toggles: IdeaFeatureToggles = {
    hasQualificationPhase: campaign.hasQualificationPhase,
    hasDiscussionPhase: campaign.hasDiscussionPhase,
    hasCommunityGraduation: campaign.hasCommunityGraduation,
    hasIdeaCoach: campaign.hasIdeaCoach,
  };

  return { campaign, toggles };
}

/**
 * Transition an idea to a new status through the state machine.
 * Status changes ONLY happen through this function — never direct prisma.update({ status }).
 */
export async function transitionIdea(input: IdeaTransitionInput, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      status: true,
      campaignId: true,
    },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const targetStatus = input.targetStatus as IdeaStatus;
  const { campaign, toggles } = await getCampaignToggles(idea.campaignId);

  if (!isValidIdeaTransition(idea.status, targetStatus, toggles, campaign.status)) {
    throw new IdeaServiceError(
      `Cannot transition from ${idea.status} to ${targetStatus}`,
      "INVALID_TRANSITION",
    );
  }

  const guardFailures = await evaluateIdeaTransitionGuards(
    idea.id,
    idea.campaignId,
    idea.status,
    targetStatus,
  );

  if (guardFailures.length > 0) {
    throw new IdeaServiceError(
      `Transition blocked: ${guardFailures.map((f) => f.message).join("; ")}`,
      "GUARD_FAILED",
    );
  }

  const updated = await prisma.idea.update({
    where: { id: input.id },
    data: {
      status: targetStatus,
      previousStatus: idea.status,
    },
    include: IDEA_INCLUDE,
  });

  eventBus.emit("idea.statusChanged", {
    entity: "idea",
    entityId: idea.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      previousStatus: idea.status,
      newStatus: targetStatus,
    },
  });

  childLogger.info({ ideaId: idea.id, from: idea.status, to: targetStatus }, "Idea transitioned");

  return serializeIdea(updated);
}

/**
 * Archive an idea with an optional reason.
 * Innovation Managers and Coaches can archive ideas from any non-DRAFT state.
 */
export async function archiveIdea(input: IdeaArchiveInput, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, campaignId: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.status === "ARCHIVED") {
    throw new IdeaServiceError("Idea is already archived", "ALREADY_ARCHIVED");
  }

  if (idea.status === "DRAFT") {
    throw new IdeaServiceError(
      "Draft ideas cannot be archived, delete them instead",
      "INVALID_STATUS",
    );
  }

  const updated = await prisma.idea.update({
    where: { id: input.id },
    data: {
      status: "ARCHIVED",
      previousStatus: idea.status,
    },
    include: IDEA_INCLUDE,
  });

  eventBus.emit("idea.archived", {
    entity: "idea",
    entityId: idea.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      previousStatus: idea.status,
      reason: input.reason,
    },
  });

  childLogger.info(
    { ideaId: idea.id, previousStatus: idea.status, reason: input.reason },
    "Idea archived",
  );

  return serializeIdea(updated);
}

/**
 * Unarchive an idea — restore to its previous status.
 */
export async function unarchiveIdea(ideaId: string, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, status: true, previousStatus: true, campaignId: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (!canUnarchive(idea.status)) {
    throw new IdeaServiceError("Only archived ideas can be unarchived", "INVALID_STATUS");
  }

  if (!idea.previousStatus) {
    throw new IdeaServiceError(
      "Cannot unarchive: no previous status recorded",
      "NO_PREVIOUS_STATUS",
    );
  }

  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: idea.previousStatus,
      previousStatus: "ARCHIVED",
    },
    include: IDEA_INCLUDE,
  });

  eventBus.emit("idea.unarchived", {
    entity: "idea",
    entityId: idea.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      restoredStatus: idea.previousStatus,
    },
  });

  childLogger.info({ ideaId: idea.id, restoredStatus: idea.previousStatus }, "Idea unarchived");

  return serializeIdea(updated);
}

/**
 * Coach qualification — submit a coach review for an idea in QUALIFICATION status.
 */
export async function coachQualify(input: CoachQualifyInput, coachId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: { id: true, status: true, campaignId: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.status !== "QUALIFICATION") {
    throw new IdeaServiceError(
      "Coach qualification is only available for ideas in QUALIFICATION status",
      "INVALID_STATUS",
    );
  }

  const qualification = await prisma.coachQualification.create({
    data: {
      ideaId: input.ideaId,
      coachId,
      decision: input.decision,
      feedback: input.feedback,
      score: input.score,
    },
  });

  eventBus.emit("idea.coachQualified", {
    entity: "idea",
    entityId: idea.id,
    actor: coachId,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      decision: input.decision,
      qualificationId: qualification.id,
    },
  });

  childLogger.info(
    { ideaId: idea.id, coachId, decision: input.decision },
    "Coach qualification submitted",
  );

  return {
    id: qualification.id,
    ideaId: qualification.ideaId,
    coachId: qualification.coachId,
    decision: qualification.decision,
    feedback: qualification.feedback,
    score: qualification.score,
    createdAt: qualification.createdAt.toISOString(),
  };
}

/**
 * Get available transitions for an idea.
 */
export async function getIdeaTransitions(ideaId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, status: true, campaignId: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const { campaign, toggles } = await getCampaignToggles(idea.campaignId);

  const validTransitions = getValidIdeaTransitions(idea.status, toggles, campaign.status);

  const transitionsWithGuards = await Promise.all(
    validTransitions.map(async (targetStatus) => {
      const guardFailures = await evaluateIdeaTransitionGuards(
        idea.id,
        idea.campaignId,
        idea.status,
        targetStatus,
      );

      return {
        targetStatus,
        guardsPass: guardFailures.length === 0,
        guardFailures: guardFailures.map((f) => ({
          guard: f.guard,
          message: f.message,
        })),
      };
    }),
  );

  return {
    currentStatus: idea.status,
    transitions: transitionsWithGuards,
  };
}

export class IdeaServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "IdeaServiceError";
  }
}
