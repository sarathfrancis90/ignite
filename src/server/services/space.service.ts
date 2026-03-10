import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type { SpaceListInput, SpaceCreateInput, SpaceUpdateInput } from "./space.schemas";

export {
  spaceListInput,
  spaceCreateInput,
  spaceUpdateInput,
  spaceGetByIdInput,
  spaceArchiveInput,
  spaceActivateInput,
} from "./space.schemas";

export type { SpaceListInput, SpaceCreateInput, SpaceUpdateInput } from "./space.schemas";

export {
  spaceAddMemberInput,
  spaceRemoveMemberInput,
  spaceChangeMemberRoleInput,
  spaceAddMembersInput,
  addMember,
  addMembers,
  removeMember,
  changeMemberRole,
} from "./space-member.service";

const childLogger = logger.child({ service: "space" });

export function isInnovationSpacesEnabled(): boolean {
  return process.env.FEATURE_INNOVATION_SPACES === "true";
}

export async function listSpaces(input: SpaceListInput) {
  const where: Prisma.InnovationSpaceWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
      { slug: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.innovationSpace.findMany({
    where,
    include: {
      _count: { select: { memberships: true } },
      memberships: {
        where: { role: "SPACE_ADMIN" },
        select: { userId: true },
      },
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
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      slug: s.slug,
      logoUrl: s.logoUrl,
      status: s.status,
      memberCount: s._count.memberships,
      adminCount: s.memberships.length,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getSpaceById(id: string) {
  const space = await prisma.innovationSpace.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, isActive: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      _count: { select: { memberships: true } },
    },
  });

  if (!space) {
    throw new SpaceServiceError("Innovation Space not found", "SPACE_NOT_FOUND");
  }

  return {
    id: space.id,
    name: space.name,
    description: space.description,
    slug: space.slug,
    logoUrl: space.logoUrl,
    status: space.status,
    settings: space.settings,
    memberCount: space._count.memberships,
    members: space.memberships.map((m) => ({
      ...m.user,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

export async function createSpace(input: SpaceCreateInput, actorId: string) {
  const existingSlug = await prisma.innovationSpace.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existingSlug) {
    throw new SpaceServiceError("A space with this slug already exists", "SLUG_ALREADY_EXISTS");
  }

  const space = await prisma.innovationSpace.create({
    data: {
      name: input.name,
      description: input.description,
      slug: input.slug,
      logoUrl: input.logoUrl,
    },
    include: {
      _count: { select: { memberships: true } },
    },
  });

  childLogger.info({ spaceId: space.id, actorId }, "Innovation Space created");

  eventBus.emit("space.created", {
    entity: "space",
    entityId: space.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: space.name, slug: space.slug },
  });

  return {
    id: space.id,
    name: space.name,
    description: space.description,
    slug: space.slug,
    logoUrl: space.logoUrl,
    status: space.status,
    memberCount: space._count.memberships,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

export async function updateSpace(input: SpaceUpdateInput, actorId: string) {
  const existing = await prisma.innovationSpace.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new SpaceServiceError("Innovation Space not found", "SPACE_NOT_FOUND");
  }

  if (input.slug) {
    const slugConflict = await prisma.innovationSpace.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (slugConflict && slugConflict.id !== input.id) {
      throw new SpaceServiceError("A space with this slug already exists", "SLUG_ALREADY_EXISTS");
    }
  }

  const data: Prisma.InnovationSpaceUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;

  const space = await prisma.innovationSpace.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { memberships: true } },
    },
  });

  childLogger.info({ spaceId: space.id, actorId }, "Innovation Space updated");

  eventBus.emit("space.updated", {
    entity: "space",
    entityId: space.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return {
    id: space.id,
    name: space.name,
    description: space.description,
    slug: space.slug,
    logoUrl: space.logoUrl,
    status: space.status,
    memberCount: space._count.memberships,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

export async function archiveSpace(id: string, actorId: string) {
  const space = await prisma.innovationSpace.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!space) {
    throw new SpaceServiceError("Innovation Space not found", "SPACE_NOT_FOUND");
  }

  if (space.status === "ARCHIVED") {
    throw new SpaceServiceError("Space is already archived", "ALREADY_ARCHIVED");
  }

  const updated = await prisma.innovationSpace.update({
    where: { id },
    data: { status: "ARCHIVED" },
    include: { _count: { select: { memberships: true } } },
  });

  childLogger.info({ spaceId: id, actorId }, "Innovation Space archived");

  eventBus.emit("space.archived", {
    entity: "space",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    slug: updated.slug,
    logoUrl: updated.logoUrl,
    status: updated.status,
    memberCount: updated._count.memberships,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function activateSpace(id: string, actorId: string) {
  const space = await prisma.innovationSpace.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!space) {
    throw new SpaceServiceError("Innovation Space not found", "SPACE_NOT_FOUND");
  }

  if (space.status === "ACTIVE") {
    throw new SpaceServiceError("Space is already active", "ALREADY_ACTIVE");
  }

  const updated = await prisma.innovationSpace.update({
    where: { id },
    data: { status: "ACTIVE" },
    include: { _count: { select: { memberships: true } } },
  });

  childLogger.info({ spaceId: id, actorId }, "Innovation Space activated");

  eventBus.emit("space.activated", {
    entity: "space",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    slug: updated.slug,
    logoUrl: updated.logoUrl,
    status: updated.status,
    memberCount: updated._count.memberships,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export class SpaceServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SpaceServiceError";
  }
}
