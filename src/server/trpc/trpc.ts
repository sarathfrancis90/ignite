/**
 * tRPC instance with RBAC middleware.
 *
 * Exports:
 *   - publicProcedure: No auth required
 *   - protectedProcedure: Verifies authentication (user must be logged in)
 *   - requirePermission(action): Verifies authorization (user must have permission)
 *
 * Every tRPC procedure must use requirePermission() for authorization.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type ZodError } from "zod";

import type {
  CampaignRole,
  GlobalRole,
  Permission,
  PermissionContext,
  ResourceContext,
} from "../lib/permissions";
import { resolvePermission } from "../lib/permissions";
import {
  getCachedResourcePermissions,
  getRedisClient,
  setCachedResourcePermissions,
} from "../lib/redis";

// ─── Context ───────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  globalRole: GlobalRole;
  isActive: boolean;
  isInternal: boolean;
  orgUnitId: string | null;
}

export interface TRPCContext {
  session: {
    user: SessionUser;
  } | null;
}

/**
 * Create context for tRPC procedures.
 * In production, this extracts the session from NextAuth.
 * For testing, the context can be provided directly.
 */
export function createTRPCContext(opts: {
  session: TRPCContext["session"];
}): TRPCContext {
  return {
    session: opts.session,
  };
}

// ─── tRPC Instance ─────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error && "issues" in error.cause
            ? (error.cause as ZodError).flatten()
            : null,
      },
    };
  },
});

export const createRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// ─── Public Procedure ──────────────────────────────────────────────────────

export const publicProcedure = t.procedure;

// ─── Auth Middleware (protectedProcedure) ───────────────────────────────────

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  if (!ctx.session.user.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account has been deactivated",
    });
  }

  return next({
    ctx: {
      session: {
        user: ctx.session.user,
      },
    },
  });
});

/**
 * protectedProcedure: Base middleware that verifies the user is authenticated
 * and their account is active. All authenticated endpoints should use this.
 */
export const protectedProcedure = t.procedure.use(enforceAuth);

// ─── RBAC Middleware (requirePermission) ────────────────────────────────────

interface RequirePermissionOptions {
  /**
   * Extract resource context from the procedure input.
   * When provided, enables Level 2 (resource role) permission checks
   * with Redis caching (5-minute TTL).
   */
  getResourceContext?: (input: unknown) => Promise<ResourceContext | null>;
}

/**
 * requirePermission(action): Composable middleware that verifies the user
 * has the required permission through the 3-level resolution:
 *
 *   Level 1: Global Role → PLATFORM_ADMIN bypasses all checks
 *   Level 2: Resource Role → campaign-specific roles (with Redis cache)
 *   Level 3: Scope → org unit membership, audience filtering
 *
 * Usage:
 *   .use(requirePermission("campaign.read"))
 *   .use(requirePermission("campaign.manage", {
 *     getResourceContext: async (input) => ({ ... })
 *   }))
 */
export function requirePermission(
  permission: Permission,
  options?: RequirePermissionOptions,
) {
  return t.middleware(async ({ ctx, next, input }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }

    const user = ctx.session.user;

    // Deactivated users are always denied
    if (!user.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account has been deactivated",
      });
    }

    const permissionCtx: PermissionContext = {
      userId: user.id,
      globalRole: user.globalRole,
      isActive: user.isActive,
      isInternal: user.isInternal,
      orgUnitId: user.orgUnitId,
    };

    // Level 1: Global role check (PLATFORM_ADMIN bypasses all)
    if (resolvePermission(permissionCtx, permission)) {
      return next({ ctx });
    }

    // Level 2: Resource role check (with Redis caching)
    if (options?.getResourceContext) {
      const resourceCtx = await options.getResourceContext(input);
      if (resourceCtx) {
        // Check Redis cache first
        let campaignRoles = resourceCtx.campaignRoles;

        if (!campaignRoles) {
          const redis = getRedisClient();
          const cached = await getCachedResourcePermissions(
            redis,
            user.id,
            resourceCtx.resourceId,
          );
          if (cached) {
            campaignRoles = cached.roles as CampaignRole[];
          }
        }

        if (campaignRoles && campaignRoles.length > 0) {
          const resourceWithRoles: ResourceContext = {
            ...resourceCtx,
            campaignRoles,
          };

          if (resolvePermission(permissionCtx, permission, resourceWithRoles)) {
            return next({ ctx });
          }
        }
      }
    }

    // Permission denied
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have permission to perform this action: ${permission}`,
    });
  });
}

// ─── Admin Procedure ───────────────────────────────────────────────────────

/**
 * adminProcedure: Shorthand for procedures requiring admin access.
 * Combines protectedProcedure with requirePermission("admin.access").
 */
export const adminProcedure = protectedProcedure.use(
  requirePermission("admin.access"),
);

// ─── Resource Permission Helper ────────────────────────────────────────────

/**
 * Helper to resolve and cache resource permissions for a user.
 * Used by routers that need to check campaign-level roles.
 */
export async function resolveAndCacheResourceRoles(
  userId: string,
  resourceId: string,
  fetchRoles: () => Promise<CampaignRole[]>,
): Promise<CampaignRole[]> {
  const redis = getRedisClient();

  // Check cache
  const cached = await getCachedResourcePermissions(redis, userId, resourceId);
  if (cached) {
    return cached.roles as CampaignRole[];
  }

  // Fetch from database
  const roles = await fetchRoles();

  // Cache the result
  await setCachedResourcePermissions(redis, userId, resourceId, roles);

  return roles;
}
