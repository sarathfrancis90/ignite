/**
 * Redis client for caching and session management.
 *
 * Provides a singleton Redis client and typed cache helpers
 * for the RBAC permission cache (5-minute TTL per user-resource pair).
 */

import Redis from "ioredis";

import {
  PERMISSION_CACHE_TTL,
  permissionCacheKey,
  userPermissionCacheKey,
} from "./permissions";

// ─── Redis Client ──────────────────────────────────────────────────────────

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redisInstance;
}

/**
 * Disconnect from Redis. Used in tests and graceful shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

// ─── Permission Cache ──────────────────────────────────────────────────────

export interface CachedPermissions {
  roles: string[];
  resolvedAt: number;
}

/**
 * Get cached resource permissions for a user-resource pair.
 */
export async function getCachedResourcePermissions(
  redis: Redis,
  userId: string,
  resourceId: string,
): Promise<CachedPermissions | null> {
  const key = permissionCacheKey(userId, resourceId);
  const cached = await redis.get(key);
  if (!cached) return null;

  return JSON.parse(cached) as CachedPermissions;
}

/**
 * Cache resource permissions for a user-resource pair.
 * Uses 5-minute TTL as specified in the architecture.
 */
export async function setCachedResourcePermissions(
  redis: Redis,
  userId: string,
  resourceId: string,
  roles: string[],
): Promise<void> {
  const key = permissionCacheKey(userId, resourceId);
  const data: CachedPermissions = {
    roles,
    resolvedAt: Date.now(),
  };
  await redis.set(key, JSON.stringify(data), "EX", PERMISSION_CACHE_TTL);
}

/**
 * Invalidate all permission cache entries for a user.
 * Called when user roles change, user is deactivated, etc.
 */
export async function invalidateUserPermissionCache(
  redis: Redis,
  userId: string,
): Promise<void> {
  const pattern = `rbac:${userId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Invalidate the global permission cache for a user.
 */
export async function invalidateGlobalPermissionCache(
  redis: Redis,
  userId: string,
): Promise<void> {
  const key = userPermissionCacheKey(userId);
  await redis.del(key);
}
