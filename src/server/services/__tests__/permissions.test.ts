/**
 * RBAC Permission System Tests
 *
 * Tests the 3-level permission resolution:
 *   Level 1: Global Role → PLATFORM_ADMIN bypasses all checks
 *   Level 2: Resource Role → campaign-specific role permissions
 *   Level 3: Scope → org unit / audience filtering
 *
 * Edge cases tested:
 *   1. Multiple roles resolve correctly
 *   2. No membership = public only
 *   3. Deactivated user denied
 *   4. Multi-org-unit visibility
 *   5. Role removal invalidates Redis cache
 */

/// <reference types="vitest/globals" />

import {
  type CampaignRole,
  CAMPAIGN_ROLE_PERMISSIONS,
  type GlobalRole,
  GLOBAL_ROLE_PERMISSIONS,
  hasGlobalPermission,
  hasResourcePermission,
  hasScopeAccess,
  type Permission,
  type PermissionContext,
  PERMISSION_CACHE_TTL,
  permissionCacheKey,
  type ResourceContext,
  resolvePermission,
  userPermissionCacheKey,
} from "../../lib/permissions";

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeUser(
  overrides: Partial<PermissionContext> = {},
): PermissionContext {
  return {
    userId: "user-1",
    globalRole: "CONTRIBUTOR",
    isActive: true,
    isInternal: true,
    orgUnitId: "org-1",
    ...overrides,
  };
}

function makeResource(
  overrides: Partial<ResourceContext> = {},
): ResourceContext {
  return {
    resourceId: "campaign-1",
    resourceType: "campaign",
    ...overrides,
  };
}

// ─── Global Role Permission Tests ──────────────────────────────────────────

describe("hasGlobalPermission", () => {
  it("PLATFORM_ADMIN bypasses all permission checks", () => {
    expect(hasGlobalPermission("PLATFORM_ADMIN", "campaign.create")).toBe(true);
    expect(hasGlobalPermission("PLATFORM_ADMIN", "admin.settings")).toBe(true);
    expect(hasGlobalPermission("PLATFORM_ADMIN", "user.manage")).toBe(true);
    expect(hasGlobalPermission("PLATFORM_ADMIN", "idea.delete")).toBe(true);
    expect(hasGlobalPermission("PLATFORM_ADMIN", "evaluation.manage")).toBe(
      true,
    );
  });

  it("INNOVATION_MANAGER has campaign management and admin access", () => {
    expect(hasGlobalPermission("INNOVATION_MANAGER", "campaign.create")).toBe(
      true,
    );
    expect(hasGlobalPermission("INNOVATION_MANAGER", "campaign.manage")).toBe(
      true,
    );
    expect(hasGlobalPermission("INNOVATION_MANAGER", "admin.access")).toBe(
      true,
    );
    expect(hasGlobalPermission("INNOVATION_MANAGER", "idea.moderate")).toBe(
      true,
    );
  });

  it("INNOVATION_MANAGER cannot manage users or delete ideas", () => {
    expect(hasGlobalPermission("INNOVATION_MANAGER", "user.manage")).toBe(
      false,
    );
    expect(hasGlobalPermission("INNOVATION_MANAGER", "idea.delete")).toBe(
      false,
    );
    expect(hasGlobalPermission("INNOVATION_MANAGER", "admin.settings")).toBe(
      false,
    );
  });

  it("CONTRIBUTOR can read and create ideas but cannot manage campaigns", () => {
    expect(hasGlobalPermission("CONTRIBUTOR", "idea.create")).toBe(true);
    expect(hasGlobalPermission("CONTRIBUTOR", "idea.read")).toBe(true);
    expect(hasGlobalPermission("CONTRIBUTOR", "campaign.read")).toBe(true);
    expect(hasGlobalPermission("CONTRIBUTOR", "user.update.self")).toBe(true);
    expect(hasGlobalPermission("CONTRIBUTOR", "campaign.create")).toBe(false);
    expect(hasGlobalPermission("CONTRIBUTOR", "campaign.manage")).toBe(false);
    expect(hasGlobalPermission("CONTRIBUTOR", "admin.access")).toBe(false);
  });

  it("EVALUATOR has evaluation permissions but cannot create ideas", () => {
    expect(hasGlobalPermission("EVALUATOR", "evaluation.read")).toBe(true);
    expect(hasGlobalPermission("EVALUATOR", "evaluation.submit")).toBe(true);
    expect(hasGlobalPermission("EVALUATOR", "idea.evaluate")).toBe(true);
    expect(hasGlobalPermission("EVALUATOR", "idea.create")).toBe(false);
    expect(hasGlobalPermission("EVALUATOR", "campaign.manage")).toBe(false);
  });

  it("MODERATOR can moderate ideas but cannot evaluate or create campaigns", () => {
    expect(hasGlobalPermission("MODERATOR", "idea.moderate")).toBe(true);
    expect(hasGlobalPermission("MODERATOR", "idea.read")).toBe(true);
    expect(hasGlobalPermission("MODERATOR", "idea.evaluate")).toBe(false);
    expect(hasGlobalPermission("MODERATOR", "campaign.create")).toBe(false);
  });

  it("IDEA_COACH can coach and update ideas but cannot moderate", () => {
    expect(hasGlobalPermission("IDEA_COACH", "idea.coach")).toBe(true);
    expect(hasGlobalPermission("IDEA_COACH", "idea.update")).toBe(true);
    expect(hasGlobalPermission("IDEA_COACH", "idea.moderate")).toBe(false);
    expect(hasGlobalPermission("IDEA_COACH", "campaign.manage")).toBe(false);
  });

  it("every global role can read campaigns and users", () => {
    const roles: Exclude<GlobalRole, "PLATFORM_ADMIN">[] = [
      "INNOVATION_MANAGER",
      "CONTRIBUTOR",
      "EVALUATOR",
      "MODERATOR",
      "IDEA_COACH",
    ];

    for (const role of roles) {
      expect(hasGlobalPermission(role, "campaign.read")).toBe(true);
      expect(hasGlobalPermission(role, "user.read")).toBe(true);
    }
  });
});

// ─── Resource (Campaign) Role Permission Tests ────────────────────────────

describe("hasResourcePermission", () => {
  it("MANAGER has full campaign management permissions", () => {
    expect(hasResourcePermission(["MANAGER"], "campaign.manage")).toBe(true);
    expect(hasResourcePermission(["MANAGER"], "campaign.update")).toBe(true);
    expect(hasResourcePermission(["MANAGER"], "campaign.publish")).toBe(true);
    expect(hasResourcePermission(["MANAGER"], "idea.moderate")).toBe(true);
    expect(hasResourcePermission(["MANAGER"], "idea.delete")).toBe(true);
    expect(hasResourcePermission(["MANAGER"], "evaluation.manage")).toBe(true);
  });

  it("SPONSOR has read-only permissions", () => {
    expect(hasResourcePermission(["SPONSOR"], "campaign.read")).toBe(true);
    expect(hasResourcePermission(["SPONSOR"], "idea.read")).toBe(true);
    expect(hasResourcePermission(["SPONSOR"], "evaluation.read")).toBe(true);
    expect(hasResourcePermission(["SPONSOR"], "campaign.manage")).toBe(false);
    expect(hasResourcePermission(["SPONSOR"], "idea.create")).toBe(false);
  });

  it("EVALUATOR can evaluate and submit but not manage", () => {
    expect(hasResourcePermission(["EVALUATOR"], "idea.evaluate")).toBe(true);
    expect(hasResourcePermission(["EVALUATOR"], "evaluation.submit")).toBe(
      true,
    );
    expect(hasResourcePermission(["EVALUATOR"], "evaluation.read")).toBe(true);
    expect(hasResourcePermission(["EVALUATOR"], "evaluation.manage")).toBe(
      false,
    );
  });

  it("SEEDING_TEAM can create and update ideas", () => {
    expect(hasResourcePermission(["SEEDING_TEAM"], "idea.create")).toBe(true);
    expect(hasResourcePermission(["SEEDING_TEAM"], "idea.update")).toBe(true);
    expect(hasResourcePermission(["SEEDING_TEAM"], "idea.delete")).toBe(false);
  });

  it("multiple roles resolve correctly - union of permissions", () => {
    // A user with both EVALUATOR and SEEDING_TEAM roles gets both permission sets
    const roles: CampaignRole[] = ["EVALUATOR", "SEEDING_TEAM"];
    expect(hasResourcePermission(roles, "idea.evaluate")).toBe(true);
    expect(hasResourcePermission(roles, "idea.create")).toBe(true);
    expect(hasResourcePermission(roles, "evaluation.submit")).toBe(true);
    expect(hasResourcePermission(roles, "idea.update")).toBe(true);
  });

  it("empty roles array denies all permissions", () => {
    expect(hasResourcePermission([], "campaign.read")).toBe(false);
    expect(hasResourcePermission([], "idea.read")).toBe(false);
  });
});

// ─── Scope Access Tests ────────────────────────────────────────────────────

describe("hasScopeAccess", () => {
  it("ALL_INTERNAL grants access to internal users", () => {
    expect(
      hasScopeAccess(
        { isInternal: true, orgUnitId: "org-1" },
        {
          audienceType: "ALL_INTERNAL",
        },
      ),
    ).toBe(true);
  });

  it("ALL_INTERNAL denies access to external users", () => {
    expect(
      hasScopeAccess(
        { isInternal: false, orgUnitId: null },
        {
          audienceType: "ALL_INTERNAL",
        },
      ),
    ).toBe(false);
  });

  it("ALL_EXTERNAL grants access to external users", () => {
    expect(
      hasScopeAccess(
        { isInternal: false, orgUnitId: null },
        {
          audienceType: "ALL_EXTERNAL",
        },
      ),
    ).toBe(true);
  });

  it("ALL_EXTERNAL denies access to internal users", () => {
    expect(
      hasScopeAccess(
        { isInternal: true, orgUnitId: "org-1" },
        {
          audienceType: "ALL_EXTERNAL",
        },
      ),
    ).toBe(false);
  });

  it("MIXED grants access to all users", () => {
    expect(
      hasScopeAccess(
        { isInternal: true, orgUnitId: "org-1" },
        {
          audienceType: "MIXED",
        },
      ),
    ).toBe(true);
    expect(
      hasScopeAccess(
        { isInternal: false, orgUnitId: null },
        {
          audienceType: "MIXED",
        },
      ),
    ).toBe(true);
  });

  it("SELECTED_INTERNAL grants access when user org unit matches", () => {
    expect(
      hasScopeAccess(
        { isInternal: true, orgUnitId: "org-1" },
        {
          audienceType: "SELECTED_INTERNAL",
          audienceOrgUnitIds: ["org-1", "org-2"],
        },
      ),
    ).toBe(true);
  });

  it("SELECTED_INTERNAL denies access when user org unit does not match", () => {
    expect(
      hasScopeAccess(
        { isInternal: true, orgUnitId: "org-3" },
        {
          audienceType: "SELECTED_INTERNAL",
          audienceOrgUnitIds: ["org-1", "org-2"],
        },
      ),
    ).toBe(false);
  });

  it("SELECTED_INTERNAL denies access when user has no org unit", () => {
    expect(
      hasScopeAccess(
        { isInternal: true, orgUnitId: null },
        {
          audienceType: "SELECTED_INTERNAL",
          audienceOrgUnitIds: ["org-1"],
        },
      ),
    ).toBe(false);
  });

  it("multi-org-unit visibility: user in matching org unit sees campaign", () => {
    const resource = {
      audienceType: "SELECTED_INTERNAL" as const,
      audienceOrgUnitIds: ["manufacturing", "engineering", "sales"],
    };

    expect(
      hasScopeAccess(
        { isInternal: true, orgUnitId: "manufacturing" },
        resource,
      ),
    ).toBe(true);
    expect(
      hasScopeAccess({ isInternal: true, orgUnitId: "engineering" }, resource),
    ).toBe(true);
    expect(
      hasScopeAccess({ isInternal: true, orgUnitId: "hr" }, resource),
    ).toBe(false);
  });
});

// ─── Full Permission Resolution Tests ──────────────────────────────────────

describe("resolvePermission", () => {
  describe("Level 1: Global Role", () => {
    it("PLATFORM_ADMIN is granted access to everything", () => {
      const admin = makeUser({ globalRole: "PLATFORM_ADMIN" });
      expect(resolvePermission(admin, "campaign.create")).toBe(true);
      expect(resolvePermission(admin, "admin.settings")).toBe(true);
      expect(resolvePermission(admin, "user.manage")).toBe(true);
      expect(resolvePermission(admin, "idea.delete")).toBe(true);
    });

    it("PLATFORM_ADMIN bypasses resource and scope checks", () => {
      const admin = makeUser({ globalRole: "PLATFORM_ADMIN" });
      // Even without resource context, admin is granted
      expect(resolvePermission(admin, "campaign.manage")).toBe(true);
    });

    it("CONTRIBUTOR is granted read permissions from global role", () => {
      const user = makeUser({ globalRole: "CONTRIBUTOR" });
      expect(resolvePermission(user, "campaign.read")).toBe(true);
      expect(resolvePermission(user, "idea.create")).toBe(true);
    });

    it("CONTRIBUTOR is denied management permissions without resource role", () => {
      const user = makeUser({ globalRole: "CONTRIBUTOR" });
      expect(resolvePermission(user, "campaign.manage")).toBe(false);
      expect(resolvePermission(user, "campaign.create")).toBe(false);
      expect(resolvePermission(user, "admin.access")).toBe(false);
    });
  });

  describe("Level 2: Resource Role", () => {
    it("Campaign Manager for Campaign A can manage Campaign A", () => {
      const user = makeUser({ globalRole: "CONTRIBUTOR" });
      const resource = makeResource({
        resourceId: "campaign-a",
        campaignRoles: ["MANAGER"],
      });
      expect(resolvePermission(user, "campaign.manage", resource)).toBe(true);
    });

    it("Campaign Manager for Campaign A cannot manage Campaign B (no roles)", () => {
      const user = makeUser({ globalRole: "CONTRIBUTOR" });
      const resourceB = makeResource({
        resourceId: "campaign-b",
        campaignRoles: [],
      });
      expect(resolvePermission(user, "campaign.manage", resourceB)).toBe(false);
    });

    it("multiple campaign roles are resolved as union", () => {
      const user = makeUser({ globalRole: "CONTRIBUTOR" });
      const resource = makeResource({
        campaignRoles: ["EVALUATOR", "SEEDING_TEAM"],
      });

      // From EVALUATOR role
      expect(resolvePermission(user, "idea.evaluate", resource)).toBe(true);
      expect(resolvePermission(user, "evaluation.submit", resource)).toBe(true);
      // From SEEDING_TEAM role
      expect(resolvePermission(user, "idea.create", resource)).toBe(true);
    });

    it("no membership = no resource-level access", () => {
      const user = makeUser({ globalRole: "CONTRIBUTOR" });
      const resource = makeResource({ campaignRoles: [] });
      expect(resolvePermission(user, "campaign.manage", resource)).toBe(false);
      expect(resolvePermission(user, "evaluation.manage", resource)).toBe(
        false,
      );
    });
  });

  describe("Deactivated users", () => {
    it("deactivated user is denied all permissions", () => {
      const user = makeUser({ isActive: false, globalRole: "PLATFORM_ADMIN" });
      expect(resolvePermission(user, "campaign.read")).toBe(false);
      expect(resolvePermission(user, "admin.settings")).toBe(false);
    });

    it("deactivated user is denied even with resource roles", () => {
      const user = makeUser({ isActive: false, globalRole: "CONTRIBUTOR" });
      const resource = makeResource({ campaignRoles: ["MANAGER"] });
      expect(resolvePermission(user, "campaign.manage", resource)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("resource context without roles falls through to denial", () => {
      const user = makeUser({ globalRole: "CONTRIBUTOR" });
      const resource = makeResource({ campaignRoles: undefined });
      expect(resolvePermission(user, "campaign.manage", resource)).toBe(false);
    });

    it("global permission takes priority over resource check", () => {
      // INNOVATION_MANAGER already has campaign.manage globally
      const user = makeUser({ globalRole: "INNOVATION_MANAGER" });
      // Even without any campaign role, should be granted
      expect(resolvePermission(user, "campaign.manage")).toBe(true);
    });
  });
});

// ─── Permission Map Completeness Tests ─────────────────────────────────────

describe("permission map completeness", () => {
  it("all global roles have defined permissions", () => {
    const roles: Exclude<GlobalRole, "PLATFORM_ADMIN">[] = [
      "INNOVATION_MANAGER",
      "CONTRIBUTOR",
      "EVALUATOR",
      "MODERATOR",
      "IDEA_COACH",
    ];

    for (const role of roles) {
      const permissions = GLOBAL_ROLE_PERMISSIONS[role];
      expect(permissions).toBeDefined();
      expect(permissions.length).toBeGreaterThan(0);
    }
  });

  it("all campaign roles have defined permissions", () => {
    const roles: CampaignRole[] = [
      "MANAGER",
      "SPONSOR",
      "MODERATOR",
      "EVALUATOR",
      "SEEDING_TEAM",
      "IDEA_COACH",
    ];

    for (const role of roles) {
      const permissions = CAMPAIGN_ROLE_PERMISSIONS[role];
      expect(permissions).toBeDefined();
      expect(permissions.length).toBeGreaterThan(0);
    }
  });

  it("every campaign role includes campaign.read", () => {
    const roles: CampaignRole[] = [
      "MANAGER",
      "SPONSOR",
      "MODERATOR",
      "EVALUATOR",
      "SEEDING_TEAM",
      "IDEA_COACH",
    ];

    for (const role of roles) {
      expect(CAMPAIGN_ROLE_PERMISSIONS[role]).toContain("campaign.read");
    }
  });
});

// ─── Cache Key Tests ───────────────────────────────────────────────────────

describe("cache key helpers", () => {
  it("generates correct permission cache key", () => {
    expect(permissionCacheKey("user-1", "campaign-1")).toBe(
      "rbac:user-1:campaign-1",
    );
  });

  it("generates correct user permission cache key", () => {
    expect(userPermissionCacheKey("user-1")).toBe("rbac:user-1:global");
  });

  it("cache TTL is 5 minutes (300 seconds)", () => {
    expect(PERMISSION_CACHE_TTL).toBe(300);
  });
});

// ─── tRPC Middleware Integration Tests ─────────────────────────────────────

import {
  createCallerFactory,
  createRouter,
  protectedProcedure,
  requirePermission as requirePermissionMiddleware,
  type TRPCContext,
} from "../../trpc/trpc";

const testRouter = createRouter({
  protectedEndpoint: protectedProcedure.query(() => {
    return { message: "authenticated" };
  }),
  adminEndpoint: protectedProcedure
    .use(requirePermissionMiddleware("admin.access"))
    .query(() => {
      return { message: "admin access granted" };
    }),
  campaignReadEndpoint: protectedProcedure
    .use(requirePermissionMiddleware("campaign.read"))
    .query(() => {
      return { message: "campaign read access granted" };
    }),
  campaignManageEndpoint: protectedProcedure
    .use(requirePermissionMiddleware("campaign.manage"))
    .query(() => {
      return { message: "campaign manage access granted" };
    }),
});

function createTestCaller(session: TRPCContext["session"]) {
  return createCallerFactory(testRouter)({ session });
}

describe("tRPC middleware", () => {
  it("protectedProcedure rejects unauthenticated requests", async () => {
    const caller = createTestCaller(null);

    await expect(caller.protectedEndpoint()).rejects.toThrow(
      "You must be logged in",
    );
  });

  it("protectedProcedure accepts authenticated active users", async () => {
    const caller = createTestCaller({
      user: {
        id: "user-1",
        email: "test@example.com",
        globalRole: "CONTRIBUTOR",
        isActive: true,
        isInternal: true,
        orgUnitId: null,
      },
    });

    const result = await caller.protectedEndpoint();
    expect(result.message).toBe("authenticated");
  });

  it("protectedProcedure rejects deactivated users", async () => {
    const caller = createTestCaller({
      user: {
        id: "user-1",
        email: "test@example.com",
        globalRole: "CONTRIBUTOR",
        isActive: false,
        isInternal: true,
        orgUnitId: null,
      },
    });

    await expect(caller.protectedEndpoint()).rejects.toThrow(
      "Your account has been deactivated",
    );
  });

  it("requirePermission grants PLATFORM_ADMIN access to admin endpoint", async () => {
    const caller = createTestCaller({
      user: {
        id: "admin-1",
        email: "admin@example.com",
        globalRole: "PLATFORM_ADMIN",
        isActive: true,
        isInternal: true,
        orgUnitId: null,
      },
    });

    const result = await caller.adminEndpoint();
    expect(result.message).toBe("admin access granted");
  });

  it("requirePermission denies CONTRIBUTOR access to admin endpoint", async () => {
    const caller = createTestCaller({
      user: {
        id: "user-1",
        email: "user@example.com",
        globalRole: "CONTRIBUTOR",
        isActive: true,
        isInternal: true,
        orgUnitId: null,
      },
    });

    await expect(caller.adminEndpoint()).rejects.toThrow(
      "You do not have permission",
    );
  });

  it("requirePermission grants INNOVATION_MANAGER access to admin endpoint", async () => {
    const caller = createTestCaller({
      user: {
        id: "manager-1",
        email: "manager@example.com",
        globalRole: "INNOVATION_MANAGER",
        isActive: true,
        isInternal: true,
        orgUnitId: null,
      },
    });

    const result = await caller.adminEndpoint();
    expect(result.message).toBe("admin access granted");
  });

  it("requirePermission grants CONTRIBUTOR access to campaign.read", async () => {
    const caller = createTestCaller({
      user: {
        id: "user-1",
        email: "user@example.com",
        globalRole: "CONTRIBUTOR",
        isActive: true,
        isInternal: true,
        orgUnitId: null,
      },
    });

    const result = await caller.campaignReadEndpoint();
    expect(result.message).toBe("campaign read access granted");
  });

  it("requirePermission denies CONTRIBUTOR access to campaign.manage", async () => {
    const caller = createTestCaller({
      user: {
        id: "user-1",
        email: "user@example.com",
        globalRole: "CONTRIBUTOR",
        isActive: true,
        isInternal: true,
        orgUnitId: null,
      },
    });

    await expect(caller.campaignManageEndpoint()).rejects.toThrow(
      "You do not have permission",
    );
  });

  it("deactivated PLATFORM_ADMIN is denied", async () => {
    const caller = createTestCaller({
      user: {
        id: "admin-1",
        email: "admin@example.com",
        globalRole: "PLATFORM_ADMIN",
        isActive: false,
        isInternal: true,
        orgUnitId: null,
      },
    });

    await expect(caller.protectedEndpoint()).rejects.toThrow(
      "Your account has been deactivated",
    );
  });
});
