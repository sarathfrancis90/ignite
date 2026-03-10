import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  addMembers,
  removeMember,
  GroupServiceError,
  groupListInput,
  groupCreateInput,
  groupUpdateInput,
} from "./group.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    userGroup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userGroupMembership: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
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

const groupFindUnique = prisma.userGroup.findUnique as unknown as Mock;
const groupFindMany = prisma.userGroup.findMany as unknown as Mock;
const groupCreate = prisma.userGroup.create as unknown as Mock;
const groupUpdate = prisma.userGroup.update as unknown as Mock;
const groupDelete = prisma.userGroup.delete as unknown as Mock;
const membershipFindUnique = prisma.userGroupMembership.findUnique as unknown as Mock;
const membershipUpsert = prisma.userGroupMembership.upsert as unknown as Mock;
const membershipCreateMany = prisma.userGroupMembership.createMany as unknown as Mock;
const membershipDelete = prisma.userGroupMembership.delete as unknown as Mock;
const membershipDeleteMany = prisma.userGroupMembership.deleteMany as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;

const mockGroups = [
  {
    id: "group-1",
    name: "Engineering",
    description: "Engineering team",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { members: 5 },
  },
  {
    id: "group-2",
    name: "Marketing",
    description: null,
    isActive: true,
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-02"),
    _count: { members: 3 },
  },
];

describe("group.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Input Validation ───────────────────────────────────

  describe("groupListInput schema", () => {
    it("accepts valid list input", () => {
      expect(groupListInput.safeParse({ limit: 20 }).success).toBe(true);
    });

    it("accepts empty input", () => {
      expect(groupListInput.safeParse({}).success).toBe(true);
    });
  });

  describe("groupCreateInput schema", () => {
    it("accepts valid create input", () => {
      expect(groupCreateInput.safeParse({ name: "Test Group", description: "Desc" }).success).toBe(
        true,
      );
    });

    it("rejects empty name", () => {
      expect(groupCreateInput.safeParse({ name: "" }).success).toBe(false);
    });

    it("rejects description over 500 chars", () => {
      expect(
        groupCreateInput.safeParse({ name: "Test", description: "x".repeat(501) }).success,
      ).toBe(false);
    });
  });

  describe("groupUpdateInput schema", () => {
    it("accepts valid update", () => {
      expect(
        groupUpdateInput.safeParse({
          id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          name: "Updated",
        }).success,
      ).toBe(true);
    });
  });

  // ── listGroups ─────────────────────────────────────────

  describe("listGroups", () => {
    it("returns paginated group list", async () => {
      groupFindMany.mockResolvedValue(mockGroups);

      const result = await listGroups({ limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.memberCount).toBe(5);
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        ...mockGroups[0],
        id: `group-${i}`,
      }));
      groupFindMany.mockResolvedValue(items);

      const result = await listGroups({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("group-2");
    });

    it("filters by search term", async () => {
      groupFindMany.mockResolvedValue([]);

      await listGroups({ limit: 20, search: "eng" });

      expect(groupFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "eng", mode: "insensitive" } },
              { description: { contains: "eng", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });
  });

  // ── getGroupById ───────────────────────────────────────

  describe("getGroupById", () => {
    it("returns group with members", async () => {
      groupFindUnique.mockResolvedValue({
        id: "group-1",
        name: "Engineering",
        description: "Engineering team",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            user: {
              id: "user-1",
              name: "Alice",
              email: "alice@test.com",
              image: null,
              isActive: true,
            },
            joinedAt: new Date(),
          },
        ],
        _count: { members: 1 },
      });

      const result = await getGroupById("group-1");

      expect(result.name).toBe("Engineering");
      expect(result.members).toHaveLength(1);
      expect(result.members[0]?.name).toBe("Alice");
    });

    it("throws if group not found", async () => {
      groupFindUnique.mockResolvedValue(null);

      await expect(getGroupById("missing")).rejects.toThrow(GroupServiceError);
      await expect(getGroupById("missing")).rejects.toMatchObject({
        code: "GROUP_NOT_FOUND",
      });
    });
  });

  // ── createGroup ────────────────────────────────────────

  describe("createGroup", () => {
    it("creates a new group", async () => {
      groupFindUnique.mockResolvedValue(null); // no existing
      groupCreate.mockResolvedValue({
        id: "new-group",
        name: "New Group",
        description: "A new group",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 0 },
      });

      const result = await createGroup(
        { name: "New Group", description: "A new group" },
        "admin-1",
      );

      expect(result.id).toBe("new-group");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "group.created",
        expect.objectContaining({ entityId: "new-group" }),
      );
    });

    it("throws if name already exists", async () => {
      groupFindUnique.mockResolvedValue({ id: "existing" });

      await expect(createGroup({ name: "Existing Group" }, "admin-1")).rejects.toMatchObject({
        code: "NAME_ALREADY_EXISTS",
      });
    });
  });

  // ── updateGroup ────────────────────────────────────────

  describe("updateGroup", () => {
    it("updates group name", async () => {
      groupFindUnique
        .mockResolvedValueOnce({ id: "group-1" }) // existing check
        .mockResolvedValueOnce(null); // name uniqueness check

      groupUpdate.mockResolvedValue({
        ...mockGroups[0],
        name: "Updated Name",
      });

      const result = await updateGroup({ id: "group-1", name: "Updated Name" }, "admin-1");

      expect(result.name).toBe("Updated Name");
      expect(eventBus.emit).toHaveBeenCalledWith("group.updated", expect.anything());
    });

    it("throws if group not found", async () => {
      groupFindUnique.mockResolvedValue(null);

      await expect(updateGroup({ id: "missing", name: "X" }, "admin-1")).rejects.toMatchObject({
        code: "GROUP_NOT_FOUND",
      });
    });

    it("throws if name conflicts with another group", async () => {
      groupFindUnique
        .mockResolvedValueOnce({ id: "group-1" }) // exists
        .mockResolvedValueOnce({ id: "group-2" }); // name conflict

      await expect(
        updateGroup({ id: "group-1", name: "Marketing" }, "admin-1"),
      ).rejects.toMatchObject({ code: "NAME_ALREADY_EXISTS" });
    });
  });

  // ── deleteGroup ────────────────────────────────────────

  describe("deleteGroup", () => {
    it("deletes group and its memberships", async () => {
      groupFindUnique.mockResolvedValue({
        ...mockGroups[0],
        _count: { members: 2 },
      });

      await deleteGroup("group-1", "admin-1");

      expect(membershipDeleteMany).toHaveBeenCalledWith({
        where: { groupId: "group-1" },
      });
      expect(groupDelete).toHaveBeenCalledWith({ where: { id: "group-1" } });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "group.deleted",
        expect.objectContaining({ entityId: "group-1" }),
      );
    });

    it("throws if group not found", async () => {
      groupFindUnique.mockResolvedValue(null);

      await expect(deleteGroup("missing", "admin-1")).rejects.toMatchObject({
        code: "GROUP_NOT_FOUND",
      });
    });
  });

  // ── addMember ──────────────────────────────────────────

  describe("addMember", () => {
    it("adds a user to the group", async () => {
      groupFindUnique.mockResolvedValue({ id: "group-1" });
      userFindUnique.mockResolvedValue({ id: "user-1" });
      membershipUpsert.mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        groupId: "group-1",
        user: { id: "user-1", name: "Alice", email: "alice@test.com" },
      });

      const result = await addMember("group-1", "user-1", "admin-1");

      expect(result.userId).toBe("user-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "group.memberAdded",
        expect.objectContaining({ entityId: "group-1" }),
      );
    });

    it("throws if group not found", async () => {
      groupFindUnique.mockResolvedValue(null);
      userFindUnique.mockResolvedValue({ id: "user-1" });

      await expect(addMember("missing", "user-1", "admin-1")).rejects.toMatchObject({
        code: "GROUP_NOT_FOUND",
      });
    });

    it("throws if user not found", async () => {
      groupFindUnique.mockResolvedValue({ id: "group-1" });
      userFindUnique.mockResolvedValue(null);

      await expect(addMember("group-1", "missing", "admin-1")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });
  });

  // ── addMembers (bulk) ─────────────────────────────────

  describe("addMembers", () => {
    it("adds multiple users to the group", async () => {
      groupFindUnique.mockResolvedValue({ id: "group-1" });
      membershipCreateMany.mockResolvedValue({ count: 2 });

      const result = await addMembers("group-1", ["user-1", "user-2"], "admin-1");

      expect(result.added).toBe(2);
      expect(membershipCreateMany).toHaveBeenCalledWith({
        data: [
          { userId: "user-1", groupId: "group-1" },
          { userId: "user-2", groupId: "group-1" },
        ],
        skipDuplicates: true,
      });
    });

    it("throws if group not found", async () => {
      groupFindUnique.mockResolvedValue(null);

      await expect(addMembers("missing", ["user-1"], "admin-1")).rejects.toMatchObject({
        code: "GROUP_NOT_FOUND",
      });
    });
  });

  // ── removeMember ───────────────────────────────────────

  describe("removeMember", () => {
    it("removes a member from the group", async () => {
      membershipFindUnique.mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        groupId: "group-1",
      });

      await removeMember("group-1", "user-1", "admin-1");

      expect(membershipDelete).toHaveBeenCalledWith({
        where: { id: "membership-1" },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "group.memberRemoved",
        expect.objectContaining({ entityId: "group-1" }),
      );
    });

    it("throws if membership not found", async () => {
      membershipFindUnique.mockResolvedValue(null);

      await expect(removeMember("group-1", "missing", "admin-1")).rejects.toMatchObject({
        code: "MEMBERSHIP_NOT_FOUND",
      });
    });
  });
});
