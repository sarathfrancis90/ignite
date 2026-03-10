import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getOrgUnitTree,
  getOrgUnitById,
  createOrgUnit,
  updateOrgUnit,
  deleteOrgUnit,
  assignUserToOrgUnit,
  removeUserFromOrgUnit,
  OrgUnitServiceError,
} from "./org-unit.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    orgUnit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    userOrgUnit: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
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

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const orgUnitFindMany = prisma.orgUnit.findMany as unknown as Mock;
const orgUnitFindUnique = prisma.orgUnit.findUnique as unknown as Mock;
const orgUnitCreate = prisma.orgUnit.create as unknown as Mock;
const orgUnitUpdate = prisma.orgUnit.update as unknown as Mock;
const orgUnitDelete = prisma.orgUnit.delete as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userOrgUnitUpsert = prisma.userOrgUnit.upsert as unknown as Mock;
const userOrgUnitFindUnique = prisma.userOrgUnit.findUnique as unknown as Mock;
const userOrgUnitDelete = prisma.userOrgUnit.delete as unknown as Mock;

describe("org-unit.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrgUnitTree", () => {
    it("returns empty array when no org units exist", async () => {
      orgUnitFindMany.mockResolvedValueOnce([]);

      const tree = await getOrgUnitTree();
      expect(tree).toEqual([]);
    });

    it("builds tree from flat list of org units", async () => {
      orgUnitFindMany.mockResolvedValueOnce([
        {
          id: "root-1",
          name: "Company",
          description: null,
          parentId: null,
          isActive: true,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          _count: { userAssignments: 2, children: 1 },
        },
        {
          id: "child-1",
          name: "Engineering",
          description: "Eng team",
          parentId: "root-1",
          isActive: true,
          createdAt: new Date("2026-01-02"),
          updatedAt: new Date("2026-01-02"),
          _count: { userAssignments: 5, children: 0 },
        },
      ]);

      const tree = await getOrgUnitTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe("root-1");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe("child-1");
      expect(tree[0].userCount).toBe(2);
      expect(tree[0].children[0].userCount).toBe(5);
    });

    it("handles multiple root nodes", async () => {
      orgUnitFindMany.mockResolvedValueOnce([
        {
          id: "root-1",
          name: "Division A",
          description: null,
          parentId: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { userAssignments: 0, children: 0 },
        },
        {
          id: "root-2",
          name: "Division B",
          description: null,
          parentId: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { userAssignments: 0, children: 0 },
        },
      ]);

      const tree = await getOrgUnitTree();
      expect(tree).toHaveLength(2);
    });
  });

  describe("getOrgUnitById", () => {
    it("returns org unit with details", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({
        id: "unit-1",
        name: "Engineering",
        description: "Eng dept",
        parentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [],
        userAssignments: [
          {
            assignedAt: new Date(),
            user: { id: "user-1", name: "Alice", email: "alice@test.com", image: null },
          },
        ],
        _count: { userAssignments: 1, children: 0 },
      });

      const result = await getOrgUnitById("unit-1");
      expect(result.id).toBe("unit-1");
      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe("alice@test.com");
    });

    it("throws ORG_UNIT_NOT_FOUND when unit does not exist", async () => {
      orgUnitFindUnique.mockResolvedValueOnce(null);

      await expect(getOrgUnitById("nonexistent")).rejects.toThrow(OrgUnitServiceError);
      await expect(getOrgUnitById("nonexistent")).rejects.toMatchObject({
        code: "ORG_UNIT_NOT_FOUND",
      });
    });
  });

  describe("createOrgUnit", () => {
    it("creates a root org unit", async () => {
      const created = {
        id: "unit-1",
        name: "Company",
        description: null,
        parentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { userAssignments: 0, children: 0 },
      };
      orgUnitCreate.mockResolvedValueOnce(created);

      const result = await createOrgUnit({ name: "Company" }, "admin-1");
      expect(result.id).toBe("unit-1");
      expect(orgUnitCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: "Company", description: undefined, parentId: null },
        }),
      );
    });

    it("creates a child org unit with valid parent", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({ id: "root-1" });
      orgUnitCreate.mockResolvedValueOnce({
        id: "child-1",
        name: "Engineering",
        parentId: "root-1",
        _count: { userAssignments: 0, children: 0 },
      });

      const result = await createOrgUnit({ name: "Engineering", parentId: "root-1" }, "admin-1");
      expect(result.id).toBe("child-1");
    });

    it("throws PARENT_NOT_FOUND when parent does not exist", async () => {
      orgUnitFindUnique.mockResolvedValueOnce(null);

      await expect(
        createOrgUnit({ name: "Team", parentId: "nonexistent" }, "admin-1"),
      ).rejects.toMatchObject({ code: "PARENT_NOT_FOUND" });
    });

    it("emits orgUnit.created event", async () => {
      orgUnitCreate.mockResolvedValueOnce({
        id: "unit-1",
        name: "Company",
        parentId: null,
        _count: { userAssignments: 0, children: 0 },
      });

      await createOrgUnit({ name: "Company" }, "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "orgUnit.created",
        expect.objectContaining({
          entity: "orgUnit",
          entityId: "unit-1",
          actor: "admin-1",
        }),
      );
    });
  });

  describe("updateOrgUnit", () => {
    it("updates org unit name", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({ id: "unit-1", parentId: null });
      orgUnitUpdate.mockResolvedValueOnce({
        id: "unit-1",
        name: "Updated Name",
        _count: { userAssignments: 0, children: 0 },
      });

      const result = await updateOrgUnit({ id: "unit-1", name: "Updated Name" }, "admin-1");
      expect(result.name).toBe("Updated Name");
    });

    it("throws ORG_UNIT_NOT_FOUND when unit does not exist", async () => {
      orgUnitFindUnique.mockResolvedValueOnce(null);

      await expect(
        updateOrgUnit({ id: "nonexistent", name: "X" }, "admin-1"),
      ).rejects.toMatchObject({ code: "ORG_UNIT_NOT_FOUND" });
    });

    it("throws CIRCULAR_REFERENCE when setting self as parent", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({ id: "unit-1", parentId: null });

      await expect(
        updateOrgUnit({ id: "unit-1", parentId: "unit-1" }, "admin-1"),
      ).rejects.toMatchObject({ code: "CIRCULAR_REFERENCE" });
    });

    it("throws CIRCULAR_REFERENCE when moving under own descendant", async () => {
      // existing unit
      orgUnitFindUnique.mockResolvedValueOnce({ id: "root-1", parentId: null });
      // parent lookup
      orgUnitFindUnique.mockResolvedValueOnce({ id: "child-1" });
      // isDescendantOf loads all units
      orgUnitFindMany.mockResolvedValueOnce([
        { id: "root-1", parentId: null },
        { id: "child-1", parentId: "root-1" },
      ]);

      await expect(
        updateOrgUnit({ id: "root-1", parentId: "child-1" }, "admin-1"),
      ).rejects.toMatchObject({ code: "CIRCULAR_REFERENCE" });
    });

    it("emits orgUnit.updated event", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({ id: "unit-1", parentId: null });
      orgUnitUpdate.mockResolvedValueOnce({
        id: "unit-1",
        name: "New Name",
        _count: { userAssignments: 0, children: 0 },
      });

      await updateOrgUnit({ id: "unit-1", name: "New Name" }, "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "orgUnit.updated",
        expect.objectContaining({
          entity: "orgUnit",
          entityId: "unit-1",
          actor: "admin-1",
        }),
      );
    });
  });

  describe("deleteOrgUnit", () => {
    it("deletes org unit with no children and no users", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({
        id: "unit-1",
        name: "Empty Unit",
        _count: { children: 0, userAssignments: 0 },
      });
      orgUnitDelete.mockResolvedValueOnce({});

      await deleteOrgUnit("unit-1", "admin-1");
      expect(orgUnitDelete).toHaveBeenCalledWith({ where: { id: "unit-1" } });
    });

    it("throws HAS_CHILDREN when unit has children", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({
        id: "unit-1",
        name: "Parent Unit",
        _count: { children: 2, userAssignments: 0 },
      });

      await expect(deleteOrgUnit("unit-1", "admin-1")).rejects.toMatchObject({
        code: "HAS_CHILDREN",
      });
    });

    it("throws HAS_USERS when unit has assigned users", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({
        id: "unit-1",
        name: "Unit with Users",
        _count: { children: 0, userAssignments: 3 },
      });

      await expect(deleteOrgUnit("unit-1", "admin-1")).rejects.toMatchObject({
        code: "HAS_USERS",
      });
    });

    it("throws ORG_UNIT_NOT_FOUND when unit does not exist", async () => {
      orgUnitFindUnique.mockResolvedValueOnce(null);

      await expect(deleteOrgUnit("nonexistent", "admin-1")).rejects.toMatchObject({
        code: "ORG_UNIT_NOT_FOUND",
      });
    });

    it("emits orgUnit.deleted event", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({
        id: "unit-1",
        name: "Deleted Unit",
        _count: { children: 0, userAssignments: 0 },
      });
      orgUnitDelete.mockResolvedValueOnce({});

      await deleteOrgUnit("unit-1", "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "orgUnit.deleted",
        expect.objectContaining({
          entity: "orgUnit",
          entityId: "unit-1",
          actor: "admin-1",
        }),
      );
    });
  });

  describe("assignUserToOrgUnit", () => {
    it("assigns user to org unit", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({ id: "unit-1" });
      userFindUnique.mockResolvedValueOnce({ id: "user-1" });
      userOrgUnitUpsert.mockResolvedValueOnce({
        id: "assignment-1",
        userId: "user-1",
        orgUnitId: "unit-1",
        user: { id: "user-1", name: "Alice", email: "alice@test.com" },
      });

      const result = await assignUserToOrgUnit("unit-1", "user-1", "admin-1");
      expect(result.userId).toBe("user-1");
    });

    it("throws ORG_UNIT_NOT_FOUND when org unit does not exist", async () => {
      orgUnitFindUnique.mockResolvedValueOnce(null);
      userFindUnique.mockResolvedValueOnce({ id: "user-1" });

      await expect(assignUserToOrgUnit("nonexistent", "user-1", "admin-1")).rejects.toMatchObject({
        code: "ORG_UNIT_NOT_FOUND",
      });
    });

    it("throws USER_NOT_FOUND when user does not exist", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({ id: "unit-1" });
      userFindUnique.mockResolvedValueOnce(null);

      await expect(assignUserToOrgUnit("unit-1", "nonexistent", "admin-1")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("emits orgUnit.userAssigned event", async () => {
      orgUnitFindUnique.mockResolvedValueOnce({ id: "unit-1" });
      userFindUnique.mockResolvedValueOnce({ id: "user-1" });
      userOrgUnitUpsert.mockResolvedValueOnce({
        id: "assignment-1",
        userId: "user-1",
        orgUnitId: "unit-1",
        user: { id: "user-1", name: "Alice", email: "alice@test.com" },
      });

      await assignUserToOrgUnit("unit-1", "user-1", "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "orgUnit.userAssigned",
        expect.objectContaining({
          entity: "orgUnit",
          entityId: "unit-1",
          actor: "admin-1",
        }),
      );
    });
  });

  describe("removeUserFromOrgUnit", () => {
    it("removes user from org unit", async () => {
      userOrgUnitFindUnique.mockResolvedValueOnce({
        id: "assignment-1",
        userId: "user-1",
        orgUnitId: "unit-1",
      });
      userOrgUnitDelete.mockResolvedValueOnce({});

      await removeUserFromOrgUnit("unit-1", "user-1", "admin-1");
      expect(userOrgUnitDelete).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
      });
    });

    it("throws ASSIGNMENT_NOT_FOUND when user is not assigned", async () => {
      userOrgUnitFindUnique.mockResolvedValueOnce(null);

      await expect(removeUserFromOrgUnit("unit-1", "user-1", "admin-1")).rejects.toMatchObject({
        code: "ASSIGNMENT_NOT_FOUND",
      });
    });

    it("emits orgUnit.userRemoved event", async () => {
      userOrgUnitFindUnique.mockResolvedValueOnce({
        id: "assignment-1",
        userId: "user-1",
        orgUnitId: "unit-1",
      });
      userOrgUnitDelete.mockResolvedValueOnce({});

      await removeUserFromOrgUnit("unit-1", "user-1", "admin-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "orgUnit.userRemoved",
        expect.objectContaining({
          entity: "orgUnit",
          entityId: "unit-1",
          actor: "admin-1",
        }),
      );
    });
  });
});
