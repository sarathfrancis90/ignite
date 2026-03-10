import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  archiveSpace,
  activateSpace,
  addMember,
  addMembers,
  removeMember,
  changeMemberRole,
  isInnovationSpacesEnabled,
  SpaceServiceError,
  spaceListInput,
  spaceCreateInput,
  spaceUpdateInput,
} from "./space.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    innovationSpace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
const spaceFindMany = prisma.innovationSpace.findMany as unknown as Mock;
const spaceCreate = prisma.innovationSpace.create as unknown as Mock;
const spaceUpdate = prisma.innovationSpace.update as unknown as Mock;
const membershipFindUnique = prisma.innovationSpaceMembership.findUnique as unknown as Mock;
const membershipUpsert = prisma.innovationSpaceMembership.upsert as unknown as Mock;
const membershipCreateMany = prisma.innovationSpaceMembership.createMany as unknown as Mock;
const membershipUpdate = prisma.innovationSpaceMembership.update as unknown as Mock;
const membershipDelete = prisma.innovationSpaceMembership.delete as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;

const mockSpaces = [
  {
    id: "space-1",
    name: "Division A",
    description: "First division",
    slug: "division-a",
    logoUrl: null,
    status: "ACTIVE",
    settings: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { memberships: 10 },
    memberships: [{ userId: "admin-1" }],
  },
  {
    id: "space-2",
    name: "Division B",
    description: null,
    slug: "division-b",
    logoUrl: null,
    status: "ACTIVE",
    settings: null,
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-02"),
    _count: { memberships: 5 },
    memberships: [],
  },
];

describe("space.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Feature flag ──────────────────────────────────────

  describe("isInnovationSpacesEnabled", () => {
    it("returns false when env var is not set", () => {
      delete process.env.FEATURE_INNOVATION_SPACES;
      expect(isInnovationSpacesEnabled()).toBe(false);
    });

    it("returns true when env var is 'true'", () => {
      process.env.FEATURE_INNOVATION_SPACES = "true";
      expect(isInnovationSpacesEnabled()).toBe(true);
    });

    it("returns false when env var is 'false'", () => {
      process.env.FEATURE_INNOVATION_SPACES = "false";
      expect(isInnovationSpacesEnabled()).toBe(false);
    });
  });

  // ── Input Validation ───────────────────────────────────

  describe("spaceListInput schema", () => {
    it("accepts valid list input", () => {
      expect(spaceListInput.safeParse({ limit: 20 }).success).toBe(true);
    });

    it("accepts empty input", () => {
      expect(spaceListInput.safeParse({}).success).toBe(true);
    });

    it("accepts status filter", () => {
      expect(spaceListInput.safeParse({ status: "ACTIVE" }).success).toBe(true);
      expect(spaceListInput.safeParse({ status: "ARCHIVED" }).success).toBe(true);
    });
  });

  describe("spaceCreateInput schema", () => {
    it("accepts valid create input", () => {
      expect(
        spaceCreateInput.safeParse({
          name: "Test Space",
          slug: "test-space",
          description: "A test space",
        }).success,
      ).toBe(true);
    });

    it("rejects empty name", () => {
      expect(spaceCreateInput.safeParse({ name: "", slug: "test" }).success).toBe(false);
    });

    it("rejects invalid slug format", () => {
      expect(spaceCreateInput.safeParse({ name: "Test", slug: "Test Space" }).success).toBe(false);
      expect(spaceCreateInput.safeParse({ name: "Test", slug: "TEST" }).success).toBe(false);
      expect(spaceCreateInput.safeParse({ name: "Test", slug: "test_space" }).success).toBe(false);
    });

    it("accepts valid slug formats", () => {
      expect(spaceCreateInput.safeParse({ name: "Test", slug: "test" }).success).toBe(true);
      expect(spaceCreateInput.safeParse({ name: "Test", slug: "test-space" }).success).toBe(true);
      expect(spaceCreateInput.safeParse({ name: "Test", slug: "test-123" }).success).toBe(true);
    });

    it("rejects slug shorter than 2 chars", () => {
      expect(spaceCreateInput.safeParse({ name: "Test", slug: "t" }).success).toBe(false);
    });
  });

  describe("spaceUpdateInput schema", () => {
    it("accepts valid update", () => {
      expect(
        spaceUpdateInput.safeParse({
          id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          name: "Updated",
        }).success,
      ).toBe(true);
    });
  });

  // ── listSpaces ─────────────────────────────────────────

  describe("listSpaces", () => {
    it("returns paginated space list", async () => {
      spaceFindMany.mockResolvedValue(mockSpaces);

      const result = await listSpaces({ limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.memberCount).toBe(10);
      expect(result.items[0]?.adminCount).toBe(1);
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        ...mockSpaces[0],
        id: `space-${i}`,
      }));
      spaceFindMany.mockResolvedValue(items);

      const result = await listSpaces({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("space-2");
    });

    it("filters by search term", async () => {
      spaceFindMany.mockResolvedValue([]);

      await listSpaces({ limit: 20, search: "div" });

      expect(spaceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "div", mode: "insensitive" } },
              { description: { contains: "div", mode: "insensitive" } },
              { slug: { contains: "div", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("filters by status", async () => {
      spaceFindMany.mockResolvedValue([]);

      await listSpaces({ limit: 20, status: "ARCHIVED" });

      expect(spaceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "ARCHIVED",
          }),
        }),
      );
    });
  });

  // ── getSpaceById ───────────────────────────────────────

  describe("getSpaceById", () => {
    it("returns space with members", async () => {
      spaceFindUnique.mockResolvedValue({
        id: "space-1",
        name: "Division A",
        description: "First division",
        slug: "division-a",
        logoUrl: null,
        status: "ACTIVE",
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            role: "SPACE_ADMIN",
            joinedAt: new Date(),
            user: {
              id: "user-1",
              name: "Alice",
              email: "alice@test.com",
              image: null,
              isActive: true,
            },
          },
        ],
        _count: { memberships: 1 },
      });

      const result = await getSpaceById("space-1");

      expect(result.name).toBe("Division A");
      expect(result.slug).toBe("division-a");
      expect(result.members).toHaveLength(1);
      expect(result.members[0]?.role).toBe("SPACE_ADMIN");
    });

    it("throws if space not found", async () => {
      spaceFindUnique.mockResolvedValue(null);

      await expect(getSpaceById("missing")).rejects.toThrow(SpaceServiceError);
      await expect(getSpaceById("missing")).rejects.toMatchObject({
        code: "SPACE_NOT_FOUND",
      });
    });
  });

  // ── createSpace ────────────────────────────────────────

  describe("createSpace", () => {
    it("creates a new space", async () => {
      spaceFindUnique.mockResolvedValue(null);
      spaceCreate.mockResolvedValue({
        id: "new-space",
        name: "New Space",
        description: "A new space",
        slug: "new-space",
        logoUrl: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { memberships: 0 },
      });

      const result = await createSpace(
        { name: "New Space", description: "A new space", slug: "new-space" },
        "admin-1",
      );

      expect(result.id).toBe("new-space");
      expect(result.slug).toBe("new-space");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.created",
        expect.objectContaining({ entityId: "new-space" }),
      );
    });

    it("throws if slug already exists", async () => {
      spaceFindUnique.mockResolvedValue({ id: "existing" });

      await expect(
        createSpace({ name: "New Space", slug: "existing-slug" }, "admin-1"),
      ).rejects.toMatchObject({
        code: "SLUG_ALREADY_EXISTS",
      });
    });
  });

  // ── updateSpace ────────────────────────────────────────

  describe("updateSpace", () => {
    it("updates space name", async () => {
      spaceFindUnique
        .mockResolvedValueOnce({ id: "space-1" }) // existing check
        .mockResolvedValueOnce(null); // no slug conflict (not checked since slug not provided)

      spaceUpdate.mockResolvedValue({
        ...mockSpaces[0],
        name: "Updated Name",
      });

      const result = await updateSpace({ id: "space-1", name: "Updated Name" }, "admin-1");

      expect(result.name).toBe("Updated Name");
      expect(eventBus.emit).toHaveBeenCalledWith("space.updated", expect.anything());
    });

    it("throws if space not found", async () => {
      spaceFindUnique.mockResolvedValue(null);

      await expect(updateSpace({ id: "missing", name: "X" }, "admin-1")).rejects.toMatchObject({
        code: "SPACE_NOT_FOUND",
      });
    });

    it("throws if slug conflicts with another space", async () => {
      spaceFindUnique
        .mockResolvedValueOnce({ id: "space-1" }) // exists
        .mockResolvedValueOnce({ id: "space-2" }); // slug conflict

      await expect(
        updateSpace({ id: "space-1", slug: "taken-slug" }, "admin-1"),
      ).rejects.toMatchObject({ code: "SLUG_ALREADY_EXISTS" });
    });
  });

  // ── archiveSpace ───────────────────────────────────────

  describe("archiveSpace", () => {
    it("archives an active space", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1", status: "ACTIVE" });
      spaceUpdate.mockResolvedValue({
        ...mockSpaces[0],
        status: "ARCHIVED",
      });

      const result = await archiveSpace("space-1", "admin-1");

      expect(result.status).toBe("ARCHIVED");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.archived",
        expect.objectContaining({ entityId: "space-1" }),
      );
    });

    it("throws if already archived", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1", status: "ARCHIVED" });

      await expect(archiveSpace("space-1", "admin-1")).rejects.toMatchObject({
        code: "ALREADY_ARCHIVED",
      });
    });

    it("throws if space not found", async () => {
      spaceFindUnique.mockResolvedValue(null);

      await expect(archiveSpace("missing", "admin-1")).rejects.toMatchObject({
        code: "SPACE_NOT_FOUND",
      });
    });
  });

  // ── activateSpace ──────────────────────────────────────

  describe("activateSpace", () => {
    it("activates an archived space", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1", status: "ARCHIVED" });
      spaceUpdate.mockResolvedValue({
        ...mockSpaces[0],
        status: "ACTIVE",
      });

      const result = await activateSpace("space-1", "admin-1");

      expect(result.status).toBe("ACTIVE");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "space.activated",
        expect.objectContaining({ entityId: "space-1" }),
      );
    });

    it("throws if already active", async () => {
      spaceFindUnique.mockResolvedValue({ id: "space-1", status: "ACTIVE" });

      await expect(activateSpace("space-1", "admin-1")).rejects.toMatchObject({
        code: "ALREADY_ACTIVE",
      });
    });
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
