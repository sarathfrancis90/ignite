import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { authenticateSsoUser } from "./sso-auth.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    ssoProvider: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userGroup: {
      findUnique: vi.fn(),
    },
    userGroupMembership: {
      findUnique: vi.fn(),
      create: vi.fn(),
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

const providerFindUnique = prisma.ssoProvider.findUnique as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userCreate = prisma.user.create as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;
const userGroupFindUnique = prisma.userGroup.findUnique as unknown as Mock;
const membershipFindUnique = prisma.userGroupMembership.findUnique as unknown as Mock;
const membershipCreate = prisma.userGroupMembership.create as unknown as Mock;

const mockProvider = {
  id: "provider-1",
  name: "okta-saml",
  type: "SAML" as const,
  isEnabled: true,
  autoProvisionUsers: true,
  defaultRole: "MEMBER" as const,
  attributeMappings: [
    { sourceAttribute: "mail", targetField: "email" },
    { sourceAttribute: "displayName", targetField: "name" },
  ],
  groupMappings: [
    { externalGroup: "admins", targetType: "global_role", targetValue: "PLATFORM_ADMIN" },
    { externalGroup: "engineering", targetType: "user_group", targetValue: "group-1" },
  ],
};

const mockUser = {
  id: "user-1",
  email: "john@example.com",
  name: "John Doe",
  image: null,
  isActive: true,
  bio: null,
  skills: [],
  globalRole: "MEMBER" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticateSsoUser", () => {
  it("authenticates an existing user", async () => {
    providerFindUnique.mockResolvedValue(mockProvider);
    userFindUnique.mockResolvedValue(mockUser);
    userUpdate.mockResolvedValue(mockUser);

    const result = await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { mail: "john@example.com", displayName: "John Doe" },
      groups: [],
    });

    expect(result).toEqual({
      id: "user-1",
      email: "john@example.com",
      name: "John Doe",
      image: null,
    });
  });

  it("auto-provisions a new user when enabled", async () => {
    providerFindUnique.mockResolvedValue(mockProvider);
    userFindUnique.mockResolvedValue(null);
    userCreate.mockResolvedValue({
      ...mockUser,
      id: "new-user-1",
      email: "new@example.com",
      name: "New User",
    });

    const result = await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "new-user",
      attributes: { mail: "new@example.com", displayName: "New User" },
      groups: [],
    });

    expect(result).toBeDefined();
    expect(userCreate).toHaveBeenCalledTimes(1);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sso.userProvisioned",
      expect.objectContaining({
        entity: "user",
      }),
    );
  });

  it("returns null when provider is disabled", async () => {
    providerFindUnique.mockResolvedValue({ ...mockProvider, isEnabled: false });

    const result = await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { mail: "john@example.com" },
      groups: [],
    });

    expect(result).toBeNull();
  });

  it("returns null when provider not found", async () => {
    providerFindUnique.mockResolvedValue(null);

    const result = await authenticateSsoUser({
      providerId: "nonexistent",
      externalId: "john",
      attributes: { mail: "john@example.com" },
      groups: [],
    });

    expect(result).toBeNull();
  });

  it("returns null for deactivated user", async () => {
    providerFindUnique.mockResolvedValue(mockProvider);
    userFindUnique.mockResolvedValue({ ...mockUser, isActive: false });

    const result = await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { mail: "john@example.com" },
      groups: [],
    });

    expect(result).toBeNull();
  });

  it("returns null when auto-provisioning is disabled and user not found", async () => {
    providerFindUnique.mockResolvedValue({ ...mockProvider, autoProvisionUsers: false });
    userFindUnique.mockResolvedValue(null);

    const result = await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { mail: "john@example.com" },
      groups: [],
    });

    expect(result).toBeNull();
  });

  it("syncs global role from group mapping", async () => {
    providerFindUnique.mockResolvedValue(mockProvider);
    userFindUnique.mockResolvedValue(mockUser);
    userUpdate.mockResolvedValue(mockUser);

    await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { mail: "john@example.com", displayName: "John Doe" },
      groups: ["admins"],
    });

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { globalRole: "PLATFORM_ADMIN" },
      }),
    );
  });

  it("syncs user group membership from group mapping", async () => {
    providerFindUnique.mockResolvedValue(mockProvider);
    userFindUnique.mockResolvedValue(mockUser);
    userUpdate.mockResolvedValue(mockUser);
    userGroupFindUnique.mockResolvedValue({ id: "group-1", name: "Engineering" });
    membershipFindUnique.mockResolvedValue(null);
    membershipCreate.mockResolvedValue({ id: "mem-1", userId: "user-1", groupId: "group-1" });

    await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { mail: "john@example.com", displayName: "John Doe" },
      groups: ["engineering"],
    });

    expect(membershipCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", groupId: "group-1" },
    });
  });

  it("uses email fallback when no email mapping exists", async () => {
    providerFindUnique.mockResolvedValue({
      ...mockProvider,
      attributeMappings: [],
    });
    userFindUnique.mockResolvedValue(mockUser);

    const result = await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { email: "john@example.com" },
      groups: [],
    });

    expect(result).toBeDefined();
  });

  it("returns null when no email can be resolved", async () => {
    providerFindUnique.mockResolvedValue({
      ...mockProvider,
      attributeMappings: [],
    });

    const result = await authenticateSsoUser({
      providerId: "provider-1",
      externalId: "john",
      attributes: { uid: "john" },
      groups: [],
    });

    expect(result).toBeNull();
  });
});
