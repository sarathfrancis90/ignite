import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getUserProfile,
  updateUserProfile,
  UserServiceError,
  updateProfileInput,
} from "./user.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  image: null,
  bio: "A developer",
  skills: ["TypeScript", "React"],
  notificationFrequency: "IMMEDIATE" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("user.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProfileInput schema", () => {
    it("accepts valid profile updates", () => {
      const result = updateProfileInput.safeParse({
        name: "New Name",
        bio: "Updated bio",
        skills: ["TypeScript"],
        notificationFrequency: "DAILY",
      });
      expect(result.success).toBe(true);
    });

    it("rejects bio over 500 chars", () => {
      const result = updateProfileInput.safeParse({
        bio: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 20 skills", () => {
      const result = updateProfileInput.safeParse({
        skills: Array.from({ length: 21 }, (_, i) => `skill-${i}`),
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid notification frequency", () => {
      const result = updateProfileInput.safeParse({
        notificationFrequency: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("getUserProfile", () => {
    it("returns user profile data", async () => {
      userFindUnique.mockResolvedValue(mockUser);

      const result = await getUserProfile("user-1");

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("test@example.com");
      expect(result.skills).toEqual(["TypeScript", "React"]);
    });

    it("throws UserServiceError if user not found", async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(getUserProfile("nonexistent")).rejects.toThrow(UserServiceError);
      await expect(getUserProfile("nonexistent")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });
  });

  describe("updateUserProfile", () => {
    it("updates user profile and emits event", async () => {
      userUpdate.mockResolvedValue({
        ...mockUser,
        name: "Updated Name",
        bio: "New bio",
      });

      const result = await updateUserProfile("user-1", {
        name: "Updated Name",
        bio: "New bio",
      });

      expect(result.name).toBe("Updated Name");
      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { name: "Updated Name", bio: "New bio" },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
        }),
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        "user.profileUpdated",
        expect.objectContaining({
          entity: "user",
          entityId: "user-1",
          actor: "user-1",
        }),
      );
    });

    it("only includes provided fields in update", async () => {
      userUpdate.mockResolvedValue(mockUser);

      await updateUserProfile("user-1", { name: "Only Name" });

      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: "Only Name" },
        }),
      );
    });
  });
});
