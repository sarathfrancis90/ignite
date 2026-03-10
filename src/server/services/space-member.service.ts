import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { SpaceRole } from "@prisma/client";
import { SpaceServiceError } from "./space.service";

export {
  spaceAddMemberInput,
  spaceRemoveMemberInput,
  spaceChangeMemberRoleInput,
  spaceAddMembersInput,
} from "./space.schemas";

const childLogger = logger.child({ service: "space-member" });

export async function addMember(spaceId: string, userId: string, role: SpaceRole, actorId: string) {
  const [space, user] = await Promise.all([
    prisma.innovationSpace.findUnique({ where: { id: spaceId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  if (!space) {
    throw new SpaceServiceError("Innovation Space not found", "SPACE_NOT_FOUND");
  }
  if (!user) {
    throw new SpaceServiceError("User not found", "USER_NOT_FOUND");
  }

  const membership = await prisma.innovationSpaceMembership.upsert({
    where: { spaceId_userId: { spaceId, userId } },
    create: { spaceId, userId, role },
    update: { role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info({ spaceId, userId, role, actorId }, "Member added to space");

  eventBus.emit("space.memberAdded", {
    entity: "space",
    entityId: spaceId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId, role },
  });

  return membership;
}

export async function addMembers(
  spaceId: string,
  userIds: string[],
  role: SpaceRole,
  actorId: string,
) {
  const space = await prisma.innovationSpace.findUnique({
    where: { id: spaceId },
    select: { id: true },
  });

  if (!space) {
    throw new SpaceServiceError("Innovation Space not found", "SPACE_NOT_FOUND");
  }

  const result = await prisma.innovationSpaceMembership.createMany({
    data: userIds.map((userId) => ({ spaceId, userId, role })),
    skipDuplicates: true,
  });

  childLogger.info({ spaceId, count: result.count, actorId }, "Members added to space");

  for (const userId of userIds) {
    eventBus.emit("space.memberAdded", {
      entity: "space",
      entityId: spaceId,
      actor: actorId,
      timestamp: new Date().toISOString(),
      metadata: { userId, role },
    });
  }

  return { spaceId, added: result.count };
}

export async function removeMember(spaceId: string, userId: string, actorId: string) {
  const membership = await prisma.innovationSpaceMembership.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
  });

  if (!membership) {
    throw new SpaceServiceError("User is not a member of this space", "MEMBERSHIP_NOT_FOUND");
  }

  await prisma.innovationSpaceMembership.delete({
    where: { id: membership.id },
  });

  childLogger.info({ spaceId, userId, actorId }, "Member removed from space");

  eventBus.emit("space.memberRemoved", {
    entity: "space",
    entityId: spaceId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId },
  });
}

export async function changeMemberRole(
  spaceId: string,
  userId: string,
  role: SpaceRole,
  actorId: string,
) {
  const membership = await prisma.innovationSpaceMembership.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
  });

  if (!membership) {
    throw new SpaceServiceError("User is not a member of this space", "MEMBERSHIP_NOT_FOUND");
  }

  const updated = await prisma.innovationSpaceMembership.update({
    where: { id: membership.id },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info({ spaceId, userId, role, actorId }, "Space member role changed");

  eventBus.emit("space.memberRoleChanged", {
    entity: "space",
    entityId: spaceId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId, previousRole: membership.role, newRole: role },
  });

  return updated;
}
