import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listUsers,
  getUserById,
  createUser,
  toggleUserActive,
  bulkAssignRole,
  bulkDeactivate,
  bulkAssignOrgUnit,
  UserAdminServiceError,
  userListInput,
  userCreateInput,
  userUpdateInput,
  bulkAssignRoleInput,
} from "./user-admin.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    userOrgUnit: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    orgUnit: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

vi.mock("@/server/services/rbac.service", () => ({
  invalidateUserCache: vi.fn().mockResolvedValue(undefined),
  updateGlobalRole: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const { invalidateUserCache, updateGlobalRole } = await import("@/server/services/rbac.service");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userFindMany = prisma.user.findMany as unknown as Mock;
const userCreate = prisma.user.create as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;
const userUpdateMany = prisma.user.updateMany as unknown as Mock;
const orgUnitFindUnique = (prisma.orgUnit as unknown as { findUnique: Mock }).findUnique;

const mockUserList = [
  {
    id: "user-1",
    email: "alice@test.com",
    name: "Alice",
    image: null,
    globalRole: "MEMBER" as const,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    orgUnitAssignments: [],
  },
  {
    id: "user-2",
    email: "bob@test.com",
    name: "Bob",
    image: null,
    globalRole: "INNOVATION_MANAGER" as const,
    isActive: true,
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-02"),
    orgUnitAssignments: [{ orgUnit: { id: "ou-1", name: "Engineering" } }],
  },
];

describe("user-admin.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Input Validation ───────────────────────────────────

  describe("userListInput schema", () => {
    it("accepts valid list input", () => {
      const result = userListInput.safeParse({ limit: 20, status: "active" });
      expect(result.success).toBe(true);
    });

    it("accepts empty input (defaults)", () => {
      const result = userListInput.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects limit over 100", () => {
      const result = userListInput.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe("userCreateInput schema", () => {
    it("accepts valid create input", () => {
      const result = userCreateInput.safeParse({
        email: "test@example.com",
        name: "Test User",
        globalRole: "MEMBER",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = userCreateInput.safeParse({ email: "not-an-email", name: "Test" });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = userCreateInput.safeParse({ email: "test@example.com", name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("userUpdateInput schema", () => {
    it("accepts valid update input", () => {
      const result = userUpdateInput.safeParse({
        userId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        name: "New Name",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("bulkAssignRoleInput schema", () => {
    it("rejects empty userIds array", () => {
      const result = bulkAssignRoleInput.safeParse({ userIds: [], globalRole: "MEMBER" });
      expect(result.success).toBe(false);
    });
  });

  // ── listUsers ──────────────────────────────────────────

  describe("listUsers", () => {
    it("returns paginated user list", async () => {
      userFindMany.mockResolvedValue(mockUserList);

      const result = await listUsers({ limit: 20, status: "all" });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeUndefined();
      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 21,
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        ...mockUserList[0],
        id: `user-${i}`,
      }));
      userFindMany.mockResolvedValue(items);

      const result = await listUsers({ limit: 2, status: "all" });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("user-2");
    });

    it("filters by search term", async () => {
      userFindMany.mockResolvedValue([]);

      await listUsers({ limit: 20, status: "all", search: "alice" });

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "alice", mode: "insensitive" } },
              { email: { contains: "alice", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("filters by active status", async () => {
      userFindMany.mockResolvedValue([]);

      await listUsers({ limit: 20, status: "active" });

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it("filters by role", async () => {
      userFindMany.mockResolvedValue([]);

      await listUsers({ limit: 20, status: "all", role: "PLATFORM_ADMIN" });

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ globalRole: "PLATFORM_ADMIN" }),
        }),
      );
    });
  });

  // ── getUserById ────────────────────────────────────────

  describe("getUserById", () => {
    it("returns user details", async () => {
      userFindUnique.mockResolvedValue({
        ...mockUserList[0],
        bio: "A bio",
        skills: ["TS"],
        notificationFrequency: "IMMEDIATE",
        userGroupMembership: [],
      });

      const result = await getUserById("user-1");
      expect(result.id).toBe("user-1");
    });

    it("throws if user not found", async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(getUserById("nonexistent")).rejects.toThrow(UserAdminServiceError);
      await expect(getUserById("nonexistent")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });
  });

  // ── createUser ─────────────────────────────────────────

  describe("createUser", () => {
    it("creates a new user", async () => {
      userFindUnique.mockResolvedValue(null); // no existing user
      userCreate.mockResolvedValue({
        id: "new-user",
        email: "new@test.com",
        name: "New User",
        globalRole: "MEMBER",
        isActive: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        orgUnitAssignments: [],
      });

      const result = await createUser(
        { email: "new@test.com", name: "New User", globalRole: "MEMBER" },
        "admin-1",
      );

      expect(result.id).toBe("new-user");
      expect(userCreate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        "user.adminCreated",
        expect.objectContaining({ entityId: "new-user" }),
      );
    });

    it("throws if email already exists", async () => {
      userFindUnique.mockResolvedValue({ id: "existing" });

      await expect(
        createUser({ email: "exists@test.com", name: "User", globalRole: "MEMBER" }, "admin-1"),
      ).rejects.toMatchObject({ code: "EMAIL_ALREADY_EXISTS" });
    });
  });

  // ── toggleUserActive ──────────────────────────────────

  describe("toggleUserActive", () => {
    it("deactivates a user and invalidates cache", async () => {
      userFindUnique.mockResolvedValue({ id: "user-1", isActive: true });
      userUpdate.mockResolvedValue({ ...mockUserList[0], isActive: false });

      const result = await toggleUserActive("user-1", false, "admin-1");

      expect(result.isActive).toBe(false);
      expect(invalidateUserCache).toHaveBeenCalledWith("user-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "user.statusChanged",
        expect.objectContaining({ entityId: "user-1" }),
      );
    });

    it("prevents self-deactivation", async () => {
      userFindUnique.mockResolvedValue({ id: "admin-1", isActive: true });

      await expect(toggleUserActive("admin-1", false, "admin-1")).rejects.toMatchObject({
        code: "SELF_DEACTIVATION",
      });
    });

    it("throws if user not found", async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(toggleUserActive("missing", false, "admin-1")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });
  });

  // ── bulkAssignRole ────────────────────────────────────

  describe("bulkAssignRole", () => {
    it("assigns role to multiple users", async () => {
      (updateGlobalRole as unknown as Mock).mockResolvedValue(undefined);

      const result = await bulkAssignRole(["user-1", "user-2"], "INNOVATION_MANAGER", "admin-1");

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(updateGlobalRole).toHaveBeenCalledTimes(2);
    });

    it("reports failures without throwing", async () => {
      (updateGlobalRole as unknown as Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("DB error"));

      const result = await bulkAssignRole(["user-1", "user-2"], "MEMBER", "admin-1");

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  // ── bulkDeactivate ────────────────────────────────────

  describe("bulkDeactivate", () => {
    it("deactivates users except the actor", async () => {
      userUpdateMany.mockResolvedValue({ count: 1 });
      (invalidateUserCache as unknown as Mock).mockResolvedValue(undefined);

      const result = await bulkDeactivate(["user-1", "admin-1"], "admin-1");

      expect(result.deactivated).toBe(1);
      // admin-1 should be filtered out
      expect(userUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ["user-1"] } },
        data: { isActive: false },
      });
    });
  });

  // ── bulkAssignOrgUnit ─────────────────────────────────

  describe("bulkAssignOrgUnit", () => {
    it("assigns org unit to multiple users", async () => {
      orgUnitFindUnique.mockResolvedValue({ id: "ou-1" });
      (prisma.userOrgUnit as unknown as { createMany: Mock }).createMany.mockResolvedValue({
        count: 2,
      });

      const result = await bulkAssignOrgUnit(["user-1", "user-2"], "ou-1", "admin-1");

      expect(result.succeeded).toBe(2);
      expect(result.orgUnitId).toBe("ou-1");
    });

    it("throws if org unit not found", async () => {
      orgUnitFindUnique.mockResolvedValue(null);

      await expect(bulkAssignOrgUnit(["user-1"], "missing", "admin-1")).rejects.toMatchObject({
        code: "ORG_UNIT_NOT_FOUND",
      });
    });
  });
});
