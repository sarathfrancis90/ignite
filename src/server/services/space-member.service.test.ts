import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { addMember, addMembers, removeMember, changeMemberRole } from "./space-member.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    innovationSpace: {
      findUnique: vi.fn(),
    },
    innovationSpaceMembership: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
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

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const spaceFindUnique = prisma.innovationSpace.findUnique as unknown as Mock;
const membershipFindUnique = prisma.innovationSpaceMembership.findUnique as unknown as Mock;
const membershipUpsert = prisma.innovationSpaceMembership.upsert as unknown as Mock;
const membershipCreateMany = prisma.innovationSpaceMembership.createMany as unknown as Mock;
const membershipUpdate = prisma.innovationSpaceMembership.update as unknown as Mock;
const membershipDelete = prisma.innovationSpaceMembership.delete as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;

describe("space-member.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── addMember ──────────────────────────────────────────

  describe("addMember", () => {
    it("adds a user to the space", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1" });
      userFindUnique.mockResolvedValue({ id: "user-1" });
      membershipUpsert.mockResolvedValue({
        id: "membership-1",
        spaceId: "space-1",
        userId: "user-1",
        role: "SPACE_MEMBER",
        user: { id: "user-1", name: "Alice", email: "alice@test.com" },
      });

      const result = await addMember("space-1", "user-1", "SPACE_MEMBER", "admin-1");

      expect(result.userId).toBe("user-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.memberAdded",
        expect.objectContaining({ entityId: "space-1" }),
      );
    });

    it("throws if space not found", async () => {
      spaceFindUnique.mockResolvedValue(null);
      userFindUnique.mockResolvedValue({ id: "user-1" });

      await expect(addMember("missing", "user-1", "SPACE_MEMBER", "admin-1")).rejects.toMatchObject(
        {
          code: "SPACE_NOT_FOUND",
        },
      );
    });

    it("throws if user not found", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1" });
      userFindUnique.mockResolvedValue(null);

      await expect(
        addMember("space-1", "missing", "SPACE_MEMBER", "admin-1"),
      ).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });
  });

  // ── addMembers (bulk) ─────────────────────────────────

  describe("addMembers", () => {
    it("adds multiple users to the space", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1" });
      membershipCreateMany.mockResolvedValue({ count: 2 });

      const result = await addMembers("space-1", ["user-1", "user-2"], "SPACE_MEMBER", "admin-1");

      expect(result.added).toBe(2);
      expect(membershipCreateMany).toHaveBeenCalledWith({
        data: [
          { spaceId: "space-1", userId: "user-1", role: "SPACE_MEMBER" },
          { spaceId: "space-1", userId: "user-2", role: "SPACE_MEMBER" },
        ],
        skipDuplicates: true,
      });
    });

    it("emits events for each added member", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1" });
      membershipCreateMany.mockResolvedValue({ count: 2 });

      await addMembers("space-1", ["user-1", "user-2"], "SPACE_MEMBER", "admin-1");

      expect(eventBus.emit).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.memberAdded",
        expect.objectContaining({
          entityId: "space-1",
          metadata: expect.objectContaining({ userId: "user-1" }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.memberAdded",
        expect.objectContaining({
          entityId: "space-1",
          metadata: expect.objectContaining({ userId: "user-2" }),
        }),
      );
    });

    it("throws if space not found", async () => {
      spaceFindUnique.mockResolvedValue(null);

      await expect(
        addMembers("missing", ["user-1"], "SPACE_MEMBER", "admin-1"),
      ).rejects.toMatchObject({
        code: "SPACE_NOT_FOUND",
      });
    });
  });

  // ── removeMember ───────────────────────────────────────

  describe("removeMember", () => {
    it("removes a member from the space", async () => {
      membershipFindUnique.mockResolvedValue({
        id: "membership-1",
        spaceId: "space-1",
        userId: "user-1",
        role: "SPACE_MEMBER",
      });

      await removeMember("space-1", "user-1", "admin-1");

      expect(membershipDelete).toHaveBeenCalledWith({
        where: { id: "membership-1" },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.memberRemoved",
        expect.objectContaining({ entityId: "space-1" }),
      );
    });

    it("throws if membership not found", async () => {
      membershipFindUnique.mockResolvedValue(null);

      await expect(removeMember("space-1", "missing", "admin-1")).rejects.toMatchObject({
        code: "MEMBERSHIP_NOT_FOUND",
      });
    });
  });

  // ── changeMemberRole ───────────────────────────────────

  describe("changeMemberRole", () => {
    it("changes a member role", async () => {
      membershipFindUnique.mockResolvedValue({
        id: "membership-1",
        spaceId: "space-1",
        userId: "user-1",
        role: "SPACE_MEMBER",
      });
      membershipUpdate.mockResolvedValue({
        id: "membership-1",
        spaceId: "space-1",
        userId: "user-1",
        role: "SPACE_ADMIN",
        user: { id: "user-1", name: "Alice", email: "alice@test.com" },
      });

      const result = await changeMemberRole("space-1", "user-1", "SPACE_ADMIN", "admin-1");

      expect(result.role).toBe("SPACE_ADMIN");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.memberRoleChanged",
        expect.objectContaining({
          entityId: "space-1",
          metadata: expect.objectContaining({
            previousRole: "SPACE_MEMBER",
            newRole: "SPACE_ADMIN",
          }),
        }),
      );
    });

    it("throws if membership not found", async () => {
      membershipFindUnique.mockResolvedValue(null);

      await expect(
        changeMemberRole("space-1", "missing", "SPACE_ADMIN", "admin-1"),
      ).rejects.toMatchObject({
        code: "MEMBERSHIP_NOT_FOUND",
      });
    });
  });
});
