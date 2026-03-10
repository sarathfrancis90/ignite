import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getUserGlobalRole,
  getUserResourceRoles,
  checkPermission,
  invalidateUserCache,
  assignResourceRole,
  removeResourceRole,
  updateGlobalRole,
  RbacServiceError,
} from "./rbac.service";
import { Action } from "@/server/lib/permissions";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    resourceRole: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

vi.mock("@/server/lib/redis", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = await import("@/server/lib/redis");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;
const resourceRoleFindMany = prisma.resourceRole.findMany as unknown as Mock;
const resourceRoleUpsert = prisma.resourceRole.upsert as unknown as Mock;
const resourceRoleDeleteMany = prisma.resourceRole.deleteMany as unknown as Mock;

describe("rbac.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserGlobalRole", () => {
    it("returns cached role when available", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("PLATFORM_ADMIN");

      const role = await getUserGlobalRole("user-1");
      expect(role).toBe("PLATFORM_ADMIN");
      expect(userFindUnique).not.toHaveBeenCalled();
    });

    it("fetches from database when cache misses", async () => {
      (cacheGet as Mock).mockResolvedValueOnce(null);
      userFindUnique.mockResolvedValueOnce({
        globalRole: "MEMBER",
        isActive: true,
      });

      const role = await getUserGlobalRole("user-1");
      expect(role).toBe("MEMBER");
      expect(userFindUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { globalRole: true, isActive: true },
      });
      expect(cacheSet).toHaveBeenCalledWith("rbac:global:user-1", "MEMBER", 300);
    });

    it("throws USER_NOT_FOUND when user does not exist", async () => {
      (cacheGet as Mock).mockResolvedValue(null);
      userFindUnique.mockResolvedValue(null);

      await expect(getUserGlobalRole("nonexistent")).rejects.toThrow(RbacServiceError);
      await expect(getUserGlobalRole("nonexistent")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("throws USER_DEACTIVATED when user is inactive", async () => {
      (cacheGet as Mock).mockResolvedValue(null);
      userFindUnique.mockResolvedValue({
        globalRole: "MEMBER",
        isActive: false,
      });

      await expect(getUserGlobalRole("inactive-user")).rejects.toThrow(RbacServiceError);
      await expect(getUserGlobalRole("inactive-user")).rejects.toMatchObject({
        code: "USER_DEACTIVATED",
      });
    });
  });

  describe("getUserResourceRoles", () => {
    it("returns cached roles when available", async () => {
      (cacheGet as Mock).mockResolvedValueOnce(JSON.stringify(["CAMPAIGN_MANAGER"]));

      const roles = await getUserResourceRoles("user-1", "campaign-1");
      expect(roles).toEqual(["CAMPAIGN_MANAGER"]);
      expect(resourceRoleFindMany).not.toHaveBeenCalled();
    });

    it("fetches from database when cache misses", async () => {
      (cacheGet as Mock).mockResolvedValueOnce(null);
      resourceRoleFindMany.mockResolvedValueOnce([
        { role: "CAMPAIGN_MANAGER" },
        { role: "CAMPAIGN_COACH" },
      ]);

      const roles = await getUserResourceRoles("user-1", "campaign-1");
      expect(roles).toEqual(["CAMPAIGN_MANAGER", "CAMPAIGN_COACH"]);
      expect(cacheSet).toHaveBeenCalledWith(
        "rbac:resource:user-1:campaign-1",
        JSON.stringify(["CAMPAIGN_MANAGER", "CAMPAIGN_COACH"]),
        300,
      );
    });

    it("returns empty array when user has no roles on resource", async () => {
      (cacheGet as Mock).mockResolvedValueOnce(null);
      resourceRoleFindMany.mockResolvedValueOnce([]);

      const roles = await getUserResourceRoles("user-1", "campaign-1");
      expect(roles).toEqual([]);
    });
  });

  describe("checkPermission", () => {
    it("PLATFORM_ADMIN bypasses all checks", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("PLATFORM_ADMIN");

      const result = await checkPermission("admin-1", Action.ADMIN_ACCESS);
      expect(result).toBe(true);
    });

    it("grants access when global role has permission", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("MEMBER");

      const result = await checkPermission("user-1", Action.USER_READ_OWN);
      expect(result).toBe(true);
    });

    it("denies access when global role lacks permission and no resource context", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("MEMBER");

      const result = await checkPermission("user-1", Action.CAMPAIGN_CREATE);
      expect(result).toBe(false);
    });

    it("grants access via resource role when global role is insufficient", async () => {
      // First call: global role cache
      (cacheGet as Mock).mockResolvedValueOnce("MEMBER");
      // Second call: resource role cache
      (cacheGet as Mock).mockResolvedValueOnce(JSON.stringify(["CAMPAIGN_MANAGER"]));

      const result = await checkPermission("user-1", Action.CAMPAIGN_UPDATE, "campaign-1");
      expect(result).toBe(true);
    });

    it("denies access when neither global nor resource role has permission", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("MEMBER");
      (cacheGet as Mock).mockResolvedValueOnce(JSON.stringify(["CAMPAIGN_CONTRIBUTOR"]));

      const result = await checkPermission("user-1", Action.CAMPAIGN_UPDATE, "campaign-1");
      expect(result).toBe(false);
    });

    it("checks multiple resource roles and grants if any match", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("MEMBER");
      (cacheGet as Mock).mockResolvedValueOnce(
        JSON.stringify(["CAMPAIGN_CONTRIBUTOR", "CAMPAIGN_COACH"]),
      );

      // CAMPAIGN_COACH can transition ideas
      const result = await checkPermission("user-1", Action.IDEA_TRANSITION, "campaign-1");
      expect(result).toBe(true);
    });

    it("denies access when resource roles list is empty", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("MEMBER");
      (cacheGet as Mock).mockResolvedValueOnce(JSON.stringify([]));

      const result = await checkPermission("user-1", Action.CAMPAIGN_MANAGE, "campaign-1");
      expect(result).toBe(false);
    });

    it("INNOVATION_MANAGER can create campaigns without resource context", async () => {
      (cacheGet as Mock).mockResolvedValueOnce("INNOVATION_MANAGER");

      const result = await checkPermission("manager-1", Action.CAMPAIGN_CREATE);
      expect(result).toBe(true);
    });
  });

  describe("invalidateUserCache", () => {
    it("clears global and resource role caches", async () => {
      await invalidateUserCache("user-1");

      expect(cacheDel).toHaveBeenCalledWith("rbac:global:user-1");
      expect(cacheDelPattern).toHaveBeenCalledWith("rbac:resource:user-1:*");
    });
  });

  describe("assignResourceRole", () => {
    it("upserts role and invalidates cache", async () => {
      resourceRoleUpsert.mockResolvedValueOnce({
        id: "role-1",
        userId: "user-1",
        resourceId: "campaign-1",
        resourceType: "CAMPAIGN",
        role: "CAMPAIGN_MANAGER",
      });

      await assignResourceRole("user-1", "campaign-1", "CAMPAIGN", "CAMPAIGN_MANAGER", "admin-1");

      expect(resourceRoleUpsert).toHaveBeenCalledWith({
        where: {
          userId_resourceId_role: {
            userId: "user-1",
            resourceId: "campaign-1",
            role: "CAMPAIGN_MANAGER",
          },
        },
        create: {
          userId: "user-1",
          resourceId: "campaign-1",
          resourceType: "CAMPAIGN",
          role: "CAMPAIGN_MANAGER",
          assignedBy: "admin-1",
        },
        update: { assignedBy: "admin-1" },
      });

      expect(cacheDel).toHaveBeenCalledWith("rbac:resource:user-1:campaign-1");
    });

    it("emits rbac.roleAssigned event", async () => {
      resourceRoleUpsert.mockResolvedValueOnce({});

      await assignResourceRole("user-1", "campaign-1", "CAMPAIGN", "CAMPAIGN_COACH", "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "rbac.roleAssigned",
        expect.objectContaining({
          entity: "resourceRole",
          actor: "admin-1",
          metadata: expect.objectContaining({
            userId: "user-1",
            resourceId: "campaign-1",
            role: "CAMPAIGN_COACH",
          }),
        }),
      );
    });
  });

  describe("removeResourceRole", () => {
    it("deletes role and invalidates cache", async () => {
      resourceRoleDeleteMany.mockResolvedValueOnce({ count: 1 });

      await removeResourceRole("user-1", "campaign-1", "CAMPAIGN_MANAGER", "admin-1");

      expect(resourceRoleDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          resourceId: "campaign-1",
          role: "CAMPAIGN_MANAGER",
        },
      });

      expect(cacheDel).toHaveBeenCalledWith("rbac:resource:user-1:campaign-1");
    });

    it("emits rbac.roleRemoved event", async () => {
      resourceRoleDeleteMany.mockResolvedValueOnce({ count: 1 });

      await removeResourceRole("user-1", "campaign-1", "CAMPAIGN_MANAGER", "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "rbac.roleRemoved",
        expect.objectContaining({
          entity: "resourceRole",
          actor: "admin-1",
        }),
      );
    });
  });

  describe("updateGlobalRole", () => {
    it("updates user role and invalidates cache", async () => {
      userFindUnique.mockResolvedValueOnce({ globalRole: "MEMBER" });
      userUpdate.mockResolvedValueOnce({
        id: "user-1",
        globalRole: "INNOVATION_MANAGER",
      });

      await updateGlobalRole("user-1", "INNOVATION_MANAGER", "admin-1");

      expect(userFindUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { globalRole: true },
      });

      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { globalRole: "INNOVATION_MANAGER" },
      });

      expect(cacheDel).toHaveBeenCalledWith("rbac:global:user-1");
      expect(cacheDelPattern).toHaveBeenCalledWith("rbac:resource:user-1:*");
    });

    it("emits rbac.globalRoleChanged event with previousRole", async () => {
      userFindUnique.mockResolvedValueOnce({ globalRole: "MEMBER" });
      userUpdate.mockResolvedValueOnce({
        id: "user-1",
        globalRole: "PLATFORM_ADMIN",
      });

      await updateGlobalRole("user-1", "PLATFORM_ADMIN", "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "rbac.globalRoleChanged",
        expect.objectContaining({
          entity: "user",
          entityId: "user-1",
          actor: "admin-1",
          metadata: expect.objectContaining({
            previousRole: "MEMBER",
            newRole: "PLATFORM_ADMIN",
          }),
        }),
      );
    });

    it("throws USER_NOT_FOUND when user does not exist", async () => {
      userFindUnique.mockResolvedValueOnce(null);

      await expect(updateGlobalRole("nonexistent", "PLATFORM_ADMIN", "admin-1")).rejects.toThrow(
        RbacServiceError,
      );
      userFindUnique.mockResolvedValueOnce(null);
      await expect(
        updateGlobalRole("nonexistent", "PLATFORM_ADMIN", "admin-1"),
      ).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });
  });
});
