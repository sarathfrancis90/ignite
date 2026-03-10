import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";

const childLogger = logger.child({ service: "group" });

// ── Input Schemas ──────────────────────────────────────────

export const groupListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export const groupCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
});

export const groupUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const groupDeleteInput = z.object({
  id: z.string().cuid(),
});

export const groupGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const groupAddMemberInput = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const groupRemoveMemberInput = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const groupAddMembersInput = z.object({
  groupId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1).max(100),
});

export type GroupListInput = z.infer<typeof groupListInput>;
export type GroupCreateInput = z.infer<typeof groupCreateInput>;
export type GroupUpdateInput = z.infer<typeof groupUpdateInput>;

// ── Service Functions ──────────────────────────────────────

export async function listGroups(input: GroupListInput) {
  const where: Prisma.UserGroupWhereInput = {};

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.userGroup.findMany({
    where,
    include: {
      _count: { select: { members: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { name: "asc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      isActive: g.isActive,
      memberCount: g._count.members,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
    nextCursor,
  };
}

export async function getGroupById(id: string) {
  const group = await prisma.userGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, isActive: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      _count: { select: { members: true } },
    },
  });

  if (!group) {
    throw new GroupServiceError("Group not found", "GROUP_NOT_FOUND");
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isActive: group.isActive,
    memberCount: group._count.members,
    members: group.members.map((m) => ({
      ...m.user,
      joinedAt: m.joinedAt,
    })),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export async function createGroup(input: GroupCreateInput, actorId: string) {
  const existing = await prisma.userGroup.findUnique({
    where: { name: input.name },
    select: { id: true },
  });

  if (existing) {
    throw new GroupServiceError("A group with this name already exists", "NAME_ALREADY_EXISTS");
  }

  const group = await prisma.userGroup.create({
    data: {
      name: input.name,
      description: input.description,
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  childLogger.info({ groupId: group.id, actorId }, "Group created");

  eventBus.emit("group.created", {
    entity: "group",
    entityId: group.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: group.name },
  });

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isActive: group.isActive,
    memberCount: group._count.members,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export async function updateGroup(input: GroupUpdateInput, actorId: string) {
  const existing = await prisma.userGroup.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new GroupServiceError("Group not found", "GROUP_NOT_FOUND");
  }

  // Check name uniqueness if name is being changed
  if (input.name) {
    const nameConflict = await prisma.userGroup.findUnique({
      where: { name: input.name },
      select: { id: true },
    });
    if (nameConflict && nameConflict.id !== input.id) {
      throw new GroupServiceError("A group with this name already exists", "NAME_ALREADY_EXISTS");
    }
  }

  const data: Prisma.UserGroupUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;

  const group = await prisma.userGroup.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { members: true } },
    },
  });

  childLogger.info({ groupId: group.id, actorId }, "Group updated");

  eventBus.emit("group.updated", {
    entity: "group",
    entityId: group.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isActive: group.isActive,
    memberCount: group._count.members,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export async function deleteGroup(id: string, actorId: string) {
  const group = await prisma.userGroup.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });

  if (!group) {
    throw new GroupServiceError("Group not found", "GROUP_NOT_FOUND");
  }

  // Delete memberships first, then the group
  await prisma.userGroupMembership.deleteMany({
    where: { groupId: id },
  });

  await prisma.userGroup.delete({ where: { id } });

  childLogger.info({ groupId: id, actorId }, "Group deleted");

  eventBus.emit("group.deleted", {
    entity: "group",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: group.name },
  });
}

export async function addMember(groupId: string, userId: string, actorId: string) {
  const [group, user] = await Promise.all([
    prisma.userGroup.findUnique({ where: { id: groupId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  if (!group) {
    throw new GroupServiceError("Group not found", "GROUP_NOT_FOUND");
  }
  if (!user) {
    throw new GroupServiceError("User not found", "USER_NOT_FOUND");
  }

  const membership = await prisma.userGroupMembership.upsert({
    where: { userId_groupId: { userId, groupId } },
    create: { userId, groupId },
    update: {},
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info({ groupId, userId, actorId }, "Member added to group");

  eventBus.emit("group.memberAdded", {
    entity: "group",
    entityId: groupId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId, groupId },
  });

  return membership;
}

export async function addMembers(groupId: string, userIds: string[], actorId: string) {
  const group = await prisma.userGroup.findUnique({
    where: { id: groupId },
    select: { id: true },
  });

  if (!group) {
    throw new GroupServiceError("Group not found", "GROUP_NOT_FOUND");
  }

  await prisma.userGroupMembership.createMany({
    data: userIds.map((userId) => ({ userId, groupId })),
    skipDuplicates: true,
  });

  childLogger.info({ groupId, count: userIds.length, actorId }, "Members added to group");

  return { groupId, added: userIds.length };
}

export async function removeMember(groupId: string, userId: string, actorId: string) {
  const membership = await prisma.userGroupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    throw new GroupServiceError("User is not a member of this group", "MEMBERSHIP_NOT_FOUND");
  }

  await prisma.userGroupMembership.delete({
    where: { id: membership.id },
  });

  childLogger.info({ groupId, userId, actorId }, "Member removed from group");

  eventBus.emit("group.memberRemoved", {
    entity: "group",
    entityId: groupId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId, groupId },
  });
}

// ── Error Class ────────────────────────────────────────────

export class GroupServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "GroupServiceError";
  }
}
