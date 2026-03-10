import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { invalidateUserCache, updateGlobalRole } from "@/server/services/rbac.service";
import type { Prisma } from "@prisma/client";

const childLogger = logger.child({ service: "user-admin" });

// ── Input Schemas ──────────────────────────────────────────

export const userListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  role: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).optional(),
  orgUnitId: z.string().cuid().optional(),
});

export const userCreateInput = z.object({
  email: z.string().email("Invalid email address").max(255),
  name: z.string().min(1, "Name is required").max(100),
  globalRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).default("MEMBER"),
});

export const userUpdateInput = z.object({
  userId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  globalRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).optional(),
  orgUnitIds: z.array(z.string().cuid()).optional(),
});

export const userToggleActiveInput = z.object({
  userId: z.string().cuid(),
  isActive: z.boolean(),
});

export const bulkAssignRoleInput = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(100),
  globalRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]),
});

export const bulkAssignOrgUnitInput = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(100),
  orgUnitId: z.string().cuid(),
});

export const bulkDeactivateInput = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(100),
});

export const userGetByIdInput = z.object({
  userId: z.string().cuid(),
});

export type UserListInput = z.infer<typeof userListInput>;
export type UserCreateInput = z.infer<typeof userCreateInput>;
export type UserUpdateInput = z.infer<typeof userUpdateInput>;

// ── User select shape ─────────────────────────────────────

const userSelectFields = {
  id: true,
  email: true,
  name: true,
  image: true,
  globalRole: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  orgUnitAssignments: {
    include: {
      orgUnit: { select: { id: true, name: true } },
    },
  },
} as const;

// ── Service Functions ──────────────────────────────────────

export async function listUsers(input: UserListInput) {
  const where: Prisma.UserWhereInput = {};

  if (input.status === "active") where.isActive = true;
  if (input.status === "inactive") where.isActive = false;
  if (input.role) where.globalRole = input.role;

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { email: { contains: input.search, mode: "insensitive" } },
    ];
  }

  if (input.orgUnitId) {
    where.orgUnitAssignments = {
      some: { orgUnitId: input.orgUnitId },
    };
  }

  const items = await prisma.user.findMany({
    where,
    select: userSelectFields,
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return { items, nextCursor };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelectFields,
      bio: true,
      skills: true,
      notificationFrequency: true,
      userGroupMembership: {
        include: {
          group: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user) {
    throw new UserAdminServiceError("User not found", "USER_NOT_FOUND");
  }

  return user;
}

export async function createUser(input: UserCreateInput, actorId: string) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new UserAdminServiceError(
      "A user with this email already exists",
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      globalRole: input.globalRole,
    },
    select: userSelectFields,
  });

  childLogger.info({ userId: user.id, actorId }, "User created by admin");

  eventBus.emit("user.adminCreated", {
    entity: "user",
    entityId: user.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { email: input.email, globalRole: input.globalRole },
  });

  return user;
}

export async function updateUser(input: UserUpdateInput, actorId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, globalRole: true },
  });

  if (!existing) {
    throw new UserAdminServiceError("User not found", "USER_NOT_FOUND");
  }

  // Update global role if changed
  if (input.globalRole && input.globalRole !== existing.globalRole) {
    await updateGlobalRole(input.userId, input.globalRole, actorId);
  }

  // Update name if provided
  if (input.name) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { name: input.name },
    });
  }

  // Update org unit assignments if provided
  if (input.orgUnitIds !== undefined) {
    await prisma.userOrgUnit.deleteMany({
      where: { userId: input.userId },
    });

    if (input.orgUnitIds.length > 0) {
      await prisma.userOrgUnit.createMany({
        data: input.orgUnitIds.map((orgUnitId) => ({
          userId: input.userId,
          orgUnitId,
        })),
      });
    }
  }

  const updated = await prisma.user.findUnique({
    where: { id: input.userId },
    select: userSelectFields,
  });

  childLogger.info({ userId: input.userId, actorId }, "User updated by admin");

  eventBus.emit("user.adminUpdated", {
    entity: "user",
    entityId: input.userId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(input).filter((k) => k !== "userId") },
  });

  return updated;
}

export async function toggleUserActive(userId: string, isActive: boolean, actorId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });

  if (!existing) {
    throw new UserAdminServiceError("User not found", "USER_NOT_FOUND");
  }

  if (userId === actorId) {
    throw new UserAdminServiceError("Cannot deactivate your own account", "SELF_DEACTIVATION");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: userSelectFields,
  });

  // Invalidate RBAC cache so deactivation takes effect immediately
  await invalidateUserCache(userId);

  const action = isActive ? "reactivated" : "deactivated";
  childLogger.info({ userId, actorId, action }, `User ${action} by admin`);

  eventBus.emit("user.statusChanged", {
    entity: "user",
    entityId: userId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { isActive, action },
  });

  return user;
}

export async function bulkAssignRole(
  userIds: string[],
  globalRole: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER",
  actorId: string,
) {
  const results = await Promise.allSettled(
    userIds.map((userId) => updateGlobalRole(userId, globalRole, actorId)),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  childLogger.info({ succeeded, failed, globalRole, actorId }, "Bulk role assignment completed");

  return { succeeded, failed, total: userIds.length };
}

export async function bulkAssignOrgUnit(userIds: string[], orgUnitId: string, actorId: string) {
  const orgUnit = await prisma.orgUnit.findUnique({
    where: { id: orgUnitId },
    select: { id: true },
  });

  if (!orgUnit) {
    throw new UserAdminServiceError("Org unit not found", "ORG_UNIT_NOT_FOUND");
  }

  const data = userIds.map((userId) => ({
    userId,
    orgUnitId,
  }));

  await prisma.userOrgUnit.createMany({
    data,
    skipDuplicates: true,
  });

  childLogger.info(
    { count: userIds.length, orgUnitId, actorId },
    "Bulk org unit assignment completed",
  );

  return { succeeded: userIds.length, orgUnitId };
}

export async function bulkDeactivate(userIds: string[], actorId: string) {
  // Filter out the actor's own ID to prevent self-deactivation
  const filteredIds = userIds.filter((id) => id !== actorId);

  const result = await prisma.user.updateMany({
    where: { id: { in: filteredIds } },
    data: { isActive: false },
  });

  // Invalidate cache for all deactivated users
  await Promise.allSettled(filteredIds.map((userId) => invalidateUserCache(userId)));

  childLogger.info({ count: result.count, actorId }, "Bulk deactivation completed");

  return { deactivated: result.count, total: filteredIds.length };
}

// ── Error Class ────────────────────────────────────────────

export class UserAdminServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UserAdminServiceError";
  }
}
