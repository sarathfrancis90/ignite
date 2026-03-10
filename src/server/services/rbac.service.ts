import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "@/server/lib/redis";
import {
  type ActionType,
  globalRoleHasPermission,
  resourceRoleHasPermission,
} from "@/server/lib/permissions";
import { eventBus } from "@/server/events/event-bus";
import type { GlobalRole, ResourceRoleType, ResourceType } from "@prisma/client";

const childLogger = logger.child({ service: "rbac" });

const CACHE_TTL_SECONDS = 300; // 5 minutes

function userGlobalRoleCacheKey(userId: string): string {
  return `rbac:global:${userId}`;
}

function userResourceRoleCacheKey(userId: string, resourceId: string): string {
  return `rbac:resource:${userId}:${resourceId}`;
}

/**
 * Fetch the user's global role, with Redis/memory cache (5-min TTL).
 */
export async function getUserGlobalRole(userId: string): Promise<GlobalRole> {
  const cacheKey = userGlobalRoleCacheKey(userId);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached as GlobalRole;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalRole: true, isActive: true },
  });

  if (!user) {
    throw new RbacServiceError("User not found", "USER_NOT_FOUND");
  }

  if (!user.isActive) {
    throw new RbacServiceError("User account is deactivated", "USER_DEACTIVATED");
  }

  await cacheSet(cacheKey, user.globalRole, CACHE_TTL_SECONDS);
  return user.globalRole;
}

/**
 * Fetch the user's resource roles for a specific resource, with cache.
 */
export async function getUserResourceRoles(
  userId: string,
  resourceId: string,
): Promise<ResourceRoleType[]> {
  const cacheKey = userResourceRoleCacheKey(userId, resourceId);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ResourceRoleType[];
  }

  const roles = await prisma.resourceRole.findMany({
    where: { userId, resourceId },
    select: { role: true },
  });

  const roleTypes = roles.map((r) => r.role);
  await cacheSet(cacheKey, JSON.stringify(roleTypes), CACHE_TTL_SECONDS);
  return roleTypes;
}

/**
 * 3-level permission check:
 *   1. Global Role — PLATFORM_ADMIN bypasses all
 *   2. Resource Role — check resource membership (if resourceId provided)
 *   3. Returns boolean indicating access
 */
export async function checkPermission(
  userId: string,
  action: ActionType,
  resourceId?: string,
): Promise<boolean> {
  const globalRole = await getUserGlobalRole(userId);

  // Level 1: PLATFORM_ADMIN bypasses all
  if (globalRole === "PLATFORM_ADMIN") {
    childLogger.debug({ userId, action, resourceId }, "Access granted: PLATFORM_ADMIN");
    return true;
  }

  // Level 1: Check global role permissions
  if (globalRoleHasPermission(globalRole, action)) {
    childLogger.debug({ userId, action, globalRole }, "Access granted: global role permission");
    return true;
  }

  // Level 2: Check resource role permissions (if resource context provided)
  if (resourceId) {
    const resourceRoles = await getUserResourceRoles(userId, resourceId);
    for (const role of resourceRoles) {
      if (resourceRoleHasPermission(role, action)) {
        childLogger.debug(
          { userId, action, resourceId, role },
          "Access granted: resource role permission",
        );
        return true;
      }
    }
  }

  childLogger.debug({ userId, action, resourceId, globalRole }, "Access denied");
  return false;
}

/**
 * Invalidate all RBAC caches for a user (on role change or deactivation).
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cacheDel(userGlobalRoleCacheKey(userId));
  await cacheDelPattern(`rbac:resource:${userId}:*`);
  childLogger.info({ userId }, "RBAC cache invalidated");
}

/**
 * Invalidate resource role cache for a specific user-resource pair.
 */
export async function invalidateResourceRoleCache(
  userId: string,
  resourceId: string,
): Promise<void> {
  await cacheDel(userResourceRoleCacheKey(userId, resourceId));
}

/**
 * Assign a resource role to a user.
 */
export async function assignResourceRole(
  userId: string,
  resourceId: string,
  resourceType: ResourceType,
  role: ResourceRoleType,
  assignedBy: string,
): Promise<void> {
  await prisma.resourceRole.upsert({
    where: {
      userId_resourceId_role: { userId, resourceId, role },
    },
    create: { userId, resourceId, resourceType, role, assignedBy },
    update: { assignedBy },
  });

  await invalidateResourceRoleCache(userId, resourceId);

  eventBus.emit("rbac.roleAssigned", {
    entity: "resourceRole",
    entityId: `${userId}:${resourceId}:${role}`,
    actor: assignedBy,
    timestamp: new Date().toISOString(),
    metadata: { userId, resourceId, resourceType, role },
  });

  childLogger.info(
    { userId, resourceId, resourceType, role, assignedBy },
    "Resource role assigned",
  );
}

/**
 * Remove a resource role from a user.
 */
export async function removeResourceRole(
  userId: string,
  resourceId: string,
  role: ResourceRoleType,
  removedBy: string,
): Promise<void> {
  await prisma.resourceRole.deleteMany({
    where: { userId, resourceId, role },
  });

  await invalidateResourceRoleCache(userId, resourceId);

  eventBus.emit("rbac.roleRemoved", {
    entity: "resourceRole",
    entityId: `${userId}:${resourceId}:${role}`,
    actor: removedBy,
    timestamp: new Date().toISOString(),
    metadata: { userId, resourceId, role },
  });

  childLogger.info({ userId, resourceId, role, removedBy }, "Resource role removed");
}

/**
 * Update a user's global role.
 */
export async function updateGlobalRole(
  userId: string,
  newRole: GlobalRole,
  updatedBy: string,
): Promise<void> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalRole: true },
  });

  if (!currentUser) {
    throw new RbacServiceError("User not found", "USER_NOT_FOUND");
  }

  const previousRole = currentUser.globalRole;

  await prisma.user.update({
    where: { id: userId },
    data: { globalRole: newRole },
  });

  await invalidateUserCache(userId);

  eventBus.emit("rbac.globalRoleChanged", {
    entity: "user",
    entityId: userId,
    actor: updatedBy,
    timestamp: new Date().toISOString(),
    metadata: { previousRole, newRole },
  });

  childLogger.info({ userId, newRole, updatedBy }, "Global role updated");
}

export class RbacServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "RbacServiceError";
  }
}
