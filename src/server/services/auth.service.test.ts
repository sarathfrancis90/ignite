import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { registerUser, AuthServiceError, registerInput } from "./auth.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
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

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("$2a$12$hashed"),
  compare: vi.fn(),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userCreate = prisma.user.create as unknown as Mock;

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerInput schema", () => {
    it("accepts valid registration data", () => {
      const result = registerInput.safeParse({
        email: "test@example.com",
        password: "password1",
        name: "Test User",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = registerInput.safeParse({
        email: "not-an-email",
        password: "password1",
        name: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const result = registerInput.safeParse({
        email: "test@example.com",
        password: "short1",
        name: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password without a number", () => {
      const result = registerInput.safeParse({
        email: "test@example.com",
        password: "password",
        name: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = registerInput.safeParse({
        email: "test@example.com",
        password: "password1",
        name: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("registerUser", () => {
    it("creates a new user with hashed password", async () => {
      userFindUnique.mockResolvedValue(null);
      userCreate.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        image: null,
        createdAt: new Date(),
      });

      const result = await registerUser({
        email: "Test@Example.com",
        password: "password1",
        name: "Test User",
      });

      expect(result.email).toBe("test@example.com");
      expect(userFindUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(userCreate).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          password: "$2a$12$hashed",
          name: "Test User",
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
        },
      });
    });

    it("emits user.registered event", async () => {
      userFindUnique.mockResolvedValue(null);
      userCreate.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        image: null,
        createdAt: new Date(),
      });

      await registerUser({
        email: "test@example.com",
        password: "password1",
        name: "Test User",
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        "user.registered",
        expect.objectContaining({
          entity: "user",
          entityId: "user-1",
          actor: "user-1",
        }),
      );
    });

    it("throws AuthServiceError if email already exists", async () => {
      userFindUnique.mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      });

      await expect(
        registerUser({
          email: "test@example.com",
          password: "password1",
          name: "Test User",
        }),
      ).rejects.toThrow(AuthServiceError);

      await expect(
        registerUser({
          email: "test@example.com",
          password: "password1",
          name: "Test User",
        }),
      ).rejects.toMatchObject({ code: "EMAIL_EXISTS" });
    });

    it("normalizes email to lowercase", async () => {
      userFindUnique.mockResolvedValue(null);
      userCreate.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        image: null,
        createdAt: new Date(),
      });

      await registerUser({
        email: "TEST@EXAMPLE.COM",
        password: "password1",
        name: "Test",
      });

      expect(userCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "test@example.com" }),
        }),
      );
    });
  });
});
