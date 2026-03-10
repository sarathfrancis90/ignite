import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type { ChannelCreateInput, ChannelUpdateInput, ChannelListInput } from "./channel.schemas";

const childLogger = logger.child({ service: "channel" });

export async function listChannels(input: ChannelListInput) {
  const where: Prisma.ChannelWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { teaser: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.channel.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { members: true } },
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
      problemStatement: c.problemStatement,
      memberCount: c._count.members,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getChannelById(id: string) {
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { members: true } },
    },
  });

  if (!channel) {
    throw new ChannelServiceError("Channel not found", "CHANNEL_NOT_FOUND");
  }

  return {
    ...channel,
    memberCount: channel._count.members,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

export async function createChannel(input: ChannelCreateInput, createdById: string) {
  const channel = await prisma.channel.create({
    data: {
      title: input.title,
      description: input.description,
      teaser: input.teaser,
      problemStatement: input.problemStatement,
      status: "ACTIVE",
      createdById,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("channel.created", {
    entity: "channel",
    entityId: channel.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: { title: channel.title },
  });

  childLogger.info({ channelId: channel.id, title: channel.title }, "Channel created");

  return {
    ...channel,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

export async function updateChannel(input: ChannelUpdateInput, updatedById: string) {
  const existing = await prisma.channel.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new ChannelServiceError("Channel not found", "CHANNEL_NOT_FOUND");
  }

  const { id, ...updateData } = input;
  const data: Prisma.ChannelUpdateInput = {};

  if (updateData.title !== undefined) data.title = updateData.title;
  if (updateData.description !== undefined) data.description = updateData.description;
  if (updateData.teaser !== undefined) data.teaser = updateData.teaser;
  if (updateData.problemStatement !== undefined)
    data.problemStatement = updateData.problemStatement;
  if (updateData.bannerUrl !== undefined) data.bannerUrl = updateData.bannerUrl;
  if (updateData.hasQualificationPhase !== undefined)
    data.hasQualificationPhase = updateData.hasQualificationPhase;
  if (updateData.hasDiscussionPhase !== undefined)
    data.hasDiscussionPhase = updateData.hasDiscussionPhase;
  if (updateData.hasVoting !== undefined) data.hasVoting = updateData.hasVoting;
  if (updateData.hasLikes !== undefined) data.hasLikes = updateData.hasLikes;
  if (updateData.votingCriteria !== undefined)
    data.votingCriteria = updateData.votingCriteria as Prisma.InputJsonValue;
  if (updateData.customFields !== undefined)
    data.customFields = updateData.customFields as Prisma.InputJsonValue;
  if (updateData.settings !== undefined)
    data.settings = updateData.settings as Prisma.InputJsonValue;

  const channel = await prisma.channel.update({
    where: { id },
    data,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("channel.updated", {
    entity: "channel",
    entityId: channel.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(updateData) },
  });

  childLogger.info({ channelId: channel.id }, "Channel updated");

  return {
    ...channel,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

export async function archiveChannel(channelId: string, actor: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, status: true },
  });

  if (!channel) {
    throw new ChannelServiceError("Channel not found", "CHANNEL_NOT_FOUND");
  }

  if (channel.status === "ARCHIVED") {
    throw new ChannelServiceError("Channel is already archived", "ALREADY_ARCHIVED");
  }

  const updated = await prisma.channel.update({
    where: { id: channelId },
    data: { status: "ARCHIVED" },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("channel.archived", {
    entity: "channel",
    entityId: channelId,
    actor,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ channelId }, "Channel archived");

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export class ChannelServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ChannelServiceError";
  }
}
