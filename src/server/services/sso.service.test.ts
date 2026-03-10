import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createSsoProvider,
  updateSsoProvider,
  deleteSsoProvider,
  getSsoProviderById,
  listSsoProviders,
  toggleSsoProvider,
  createAttributeMapping,
  updateAttributeMapping,
  deleteAttributeMapping,
  listAttributeMappings,
  createGroupMapping,
  updateGroupMapping,
  deleteGroupMapping,
  listGroupMappings,
  getEnabledSsoProviders,
  SsoServiceError,
} from "./sso.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    ssoProvider: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ssoAttributeMapping: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ssoGroupMapping: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userGroup: {
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

const providerFindUnique = prisma.ssoProvider.findUnique as unknown as Mock;
const providerFindMany = prisma.ssoProvider.findMany as unknown as Mock;
const providerCreate = prisma.ssoProvider.create as unknown as Mock;
const providerUpdate = prisma.ssoProvider.update as unknown as Mock;
const providerDelete = prisma.ssoProvider.delete as unknown as Mock;
const attrMappingFindUnique = prisma.ssoAttributeMapping.findUnique as unknown as Mock;
const attrMappingFindMany = prisma.ssoAttributeMapping.findMany as unknown as Mock;
const attrMappingCreate = prisma.ssoAttributeMapping.create as unknown as Mock;
const attrMappingUpdate = prisma.ssoAttributeMapping.update as unknown as Mock;
const attrMappingDelete = prisma.ssoAttributeMapping.delete as unknown as Mock;
const groupMappingFindUnique = prisma.ssoGroupMapping.findUnique as unknown as Mock;
const groupMappingFindMany = prisma.ssoGroupMapping.findMany as unknown as Mock;
const groupMappingCreate = prisma.ssoGroupMapping.create as unknown as Mock;
const groupMappingUpdate = prisma.ssoGroupMapping.update as unknown as Mock;
const groupMappingDelete = prisma.ssoGroupMapping.delete as unknown as Mock;
const userGroupFindUnique = prisma.userGroup.findUnique as unknown as Mock;

const mockSamlProvider = {
  id: "provider-1",
  name: "okta-saml",
  displayName: "Okta SAML",
  type: "SAML" as const,
  isEnabled: false,
  samlEntityId: "https://okta.example.com/entity",
  samlSsoUrl: "https://okta.example.com/sso",
  samlSloUrl: null,
  samlCertificate: "MIIC...",
  samlMetadataUrl: null,
  samlSignRequests: false,
  samlWantAssertionsSigned: true,
  ldapUrl: null,
  ldapBindDn: null,
  ldapBindCredential: null,
  ldapSearchBase: null,
  ldapSearchFilter: null,
  ldapUseTls: false,
  ldapGroupSearchBase: null,
  ldapGroupSearchFilter: null,
  autoProvisionUsers: true,
  defaultRole: "MEMBER" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  attributeMappings: [],
  groupMappings: [],
};

const mockLdapProvider = {
  id: "provider-2",
  name: "corp-ldap",
  displayName: "Corporate LDAP",
  type: "LDAP" as const,
  isEnabled: false,
  samlEntityId: null,
  samlSsoUrl: null,
  samlSloUrl: null,
  samlCertificate: null,
  samlMetadataUrl: null,
  samlSignRequests: false,
  samlWantAssertionsSigned: true,
  ldapUrl: "ldap://ldap.example.com:389",
  ldapBindDn: "cn=admin,dc=example,dc=com",
  ldapBindCredential: "secret",
  ldapSearchBase: "ou=users,dc=example,dc=com",
  ldapSearchFilter: "(uid={{username}})",
  ldapUseTls: true,
  ldapGroupSearchBase: "ou=groups,dc=example,dc=com",
  ldapGroupSearchFilter: "(member={{dn}})",
  autoProvisionUsers: true,
  defaultRole: "MEMBER" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  attributeMappings: [],
  groupMappings: [],
};

const actorId = "admin-user-1";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Provider CRUD ─────────────────────────────────────────────

describe("createSsoProvider", () => {
  it("creates a SAML provider successfully", async () => {
    providerFindUnique.mockResolvedValue(null);
    providerCreate.mockResolvedValue(mockSamlProvider);

    const result = await createSsoProvider(
      {
        name: "okta-saml",
        displayName: "Okta SAML",
        type: "SAML",
        isEnabled: false,
        autoProvisionUsers: true,
        defaultRole: "MEMBER",
        saml: {
          samlEntityId: "https://okta.example.com/entity",
          samlSsoUrl: "https://okta.example.com/sso",
          samlCertificate: "MIIC...",
          samlSignRequests: false,
          samlWantAssertionsSigned: true,
        },
      },
      actorId,
    );

    expect(result).toEqual(mockSamlProvider);
    expect(providerCreate).toHaveBeenCalledTimes(1);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sso.providerCreated",
      expect.objectContaining({
        entity: "ssoProvider",
        entityId: "provider-1",
      }),
    );
  });

  it("creates an LDAP provider successfully", async () => {
    providerFindUnique.mockResolvedValue(null);
    providerCreate.mockResolvedValue(mockLdapProvider);

    const result = await createSsoProvider(
      {
        name: "corp-ldap",
        displayName: "Corporate LDAP",
        type: "LDAP",
        isEnabled: false,
        autoProvisionUsers: true,
        defaultRole: "MEMBER",
        ldap: {
          ldapUrl: "ldap://ldap.example.com:389",
          ldapBindDn: "cn=admin,dc=example,dc=com",
          ldapBindCredential: "secret",
          ldapSearchBase: "ou=users,dc=example,dc=com",
          ldapSearchFilter: "(uid={{username}})",
          ldapUseTls: true,
          ldapGroupSearchBase: "ou=groups,dc=example,dc=com",
          ldapGroupSearchFilter: "(member={{dn}})",
        },
      },
      actorId,
    );

    expect(result).toEqual(mockLdapProvider);
    expect(providerCreate).toHaveBeenCalledTimes(1);
  });

  it("throws NAME_EXISTS if name is taken", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);

    await expect(
      createSsoProvider(
        {
          name: "okta-saml",
          displayName: "Okta SAML",
          type: "SAML",
          isEnabled: false,
          autoProvisionUsers: true,
          defaultRole: "MEMBER",
          saml: {
            samlEntityId: "https://okta.example.com/entity",
            samlSsoUrl: "https://okta.example.com/sso",
            samlCertificate: "MIIC...",
            samlSignRequests: false,
            samlWantAssertionsSigned: true,
          },
        },
        actorId,
      ),
    ).rejects.toThrow(SsoServiceError);
  });
});

describe("updateSsoProvider", () => {
  it("updates a provider display name", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    providerUpdate.mockResolvedValue({ ...mockSamlProvider, displayName: "New Name" });

    const result = await updateSsoProvider({ id: "provider-1", displayName: "New Name" }, actorId);

    expect(result.displayName).toBe("New Name");
    expect(providerUpdate).toHaveBeenCalledTimes(1);
  });

  it("throws PROVIDER_NOT_FOUND if provider does not exist", async () => {
    providerFindUnique.mockResolvedValue(null);

    await expect(updateSsoProvider({ id: "nonexistent" }, actorId)).rejects.toThrow(
      SsoServiceError,
    );
  });
});

describe("deleteSsoProvider", () => {
  it("deletes a disabled provider", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    providerDelete.mockResolvedValue(mockSamlProvider);

    await deleteSsoProvider("provider-1", actorId);

    expect(providerDelete).toHaveBeenCalledWith({ where: { id: "provider-1" } });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sso.providerDeleted",
      expect.objectContaining({
        entityId: "provider-1",
      }),
    );
  });

  it("throws PROVIDER_ENABLED if provider is enabled", async () => {
    providerFindUnique.mockResolvedValue({ ...mockSamlProvider, isEnabled: true });

    await expect(deleteSsoProvider("provider-1", actorId)).rejects.toThrow(SsoServiceError);
  });

  it("throws PROVIDER_NOT_FOUND if provider does not exist", async () => {
    providerFindUnique.mockResolvedValue(null);

    await expect(deleteSsoProvider("nonexistent", actorId)).rejects.toThrow(SsoServiceError);
  });
});

describe("getSsoProviderById", () => {
  it("returns sanitized provider", async () => {
    providerFindUnique.mockResolvedValue(mockLdapProvider);

    const result = await getSsoProviderById("provider-2");

    expect(result.ldapBindCredential).toBe("********");
    expect(result.name).toBe("corp-ldap");
  });

  it("throws PROVIDER_NOT_FOUND if not found", async () => {
    providerFindUnique.mockResolvedValue(null);

    await expect(getSsoProviderById("nonexistent")).rejects.toThrow(SsoServiceError);
  });
});

describe("listSsoProviders", () => {
  it("returns paginated providers", async () => {
    providerFindMany.mockResolvedValue([mockSamlProvider, mockLdapProvider]);

    const result = await listSsoProviders({ limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when more items exist", async () => {
    const providers = [
      mockSamlProvider,
      mockLdapProvider,
      { ...mockSamlProvider, id: "provider-3" },
    ];
    providerFindMany.mockResolvedValue(providers);

    const result = await listSsoProviders({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("provider-3");
  });

  it("filters by type", async () => {
    providerFindMany.mockResolvedValue([mockSamlProvider]);

    await listSsoProviders({ limit: 20, type: "SAML" });

    expect(providerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: "SAML" },
      }),
    );
  });
});

describe("toggleSsoProvider", () => {
  it("enables a provider with complete config", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    providerUpdate.mockResolvedValue({ ...mockSamlProvider, isEnabled: true });

    const result = await toggleSsoProvider("provider-1", true, actorId);

    expect(result.isEnabled).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sso.providerEnabled",
      expect.objectContaining({
        entityId: "provider-1",
      }),
    );
  });

  it("throws INCOMPLETE_CONFIG for SAML without required fields", async () => {
    providerFindUnique.mockResolvedValue({
      ...mockSamlProvider,
      samlEntityId: null,
      samlSsoUrl: null,
      samlCertificate: null,
    });

    await expect(toggleSsoProvider("provider-1", true, actorId)).rejects.toThrow(SsoServiceError);
  });

  it("throws INCOMPLETE_CONFIG for LDAP without required fields", async () => {
    providerFindUnique.mockResolvedValue({
      ...mockLdapProvider,
      ldapUrl: null,
    });

    await expect(toggleSsoProvider("provider-2", true, actorId)).rejects.toThrow(SsoServiceError);
  });

  it("disables without config validation", async () => {
    providerFindUnique.mockResolvedValue({ ...mockSamlProvider, isEnabled: true });
    providerUpdate.mockResolvedValue({ ...mockSamlProvider, isEnabled: false });

    const result = await toggleSsoProvider("provider-1", false, actorId);

    expect(result.isEnabled).toBe(false);
  });
});

// ── Attribute Mapping CRUD ──────────────────────────────────────

describe("createAttributeMapping", () => {
  it("creates a mapping successfully", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    const mockMapping = {
      id: "mapping-1",
      ssoProviderId: "provider-1",
      sourceAttribute: "mail",
      targetField: "email",
    };
    attrMappingCreate.mockResolvedValue(mockMapping);

    const result = await createAttributeMapping(
      { ssoProviderId: "provider-1", sourceAttribute: "mail", targetField: "email" },
      actorId,
    );

    expect(result).toEqual(mockMapping);
  });

  it("throws PROVIDER_NOT_FOUND if provider does not exist", async () => {
    providerFindUnique.mockResolvedValue(null);

    await expect(
      createAttributeMapping(
        { ssoProviderId: "nonexistent", sourceAttribute: "mail", targetField: "email" },
        actorId,
      ),
    ).rejects.toThrow(SsoServiceError);
  });
});

describe("updateAttributeMapping", () => {
  it("updates a mapping", async () => {
    attrMappingFindUnique.mockResolvedValue({
      id: "mapping-1",
      ssoProviderId: "provider-1",
      sourceAttribute: "mail",
      targetField: "email",
    });
    attrMappingUpdate.mockResolvedValue({
      id: "mapping-1",
      ssoProviderId: "provider-1",
      sourceAttribute: "emailAddress",
      targetField: "email",
    });

    const result = await updateAttributeMapping(
      { id: "mapping-1", sourceAttribute: "emailAddress" },
      actorId,
    );

    expect(result.sourceAttribute).toBe("emailAddress");
  });

  it("throws MAPPING_NOT_FOUND if mapping does not exist", async () => {
    attrMappingFindUnique.mockResolvedValue(null);

    await expect(updateAttributeMapping({ id: "nonexistent" }, actorId)).rejects.toThrow(
      SsoServiceError,
    );
  });
});

describe("deleteAttributeMapping", () => {
  it("deletes a mapping", async () => {
    attrMappingFindUnique.mockResolvedValue({
      id: "mapping-1",
      ssoProviderId: "provider-1",
    });
    attrMappingDelete.mockResolvedValue(undefined);

    await deleteAttributeMapping("mapping-1", actorId);

    expect(attrMappingDelete).toHaveBeenCalledWith({ where: { id: "mapping-1" } });
  });
});

describe("listAttributeMappings", () => {
  it("lists mappings for a provider", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    attrMappingFindMany.mockResolvedValue([
      {
        id: "mapping-1",
        ssoProviderId: "provider-1",
        sourceAttribute: "mail",
        targetField: "email",
      },
    ]);

    const result = await listAttributeMappings("provider-1");

    expect(result).toHaveLength(1);
  });
});

// ── Group Mapping CRUD ──────────────────────────────────────────

describe("createGroupMapping", () => {
  it("creates a global_role mapping", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    const mockMapping = {
      id: "gm-1",
      ssoProviderId: "provider-1",
      externalGroup: "admins",
      targetType: "GLOBAL_ROLE",
      targetValue: "PLATFORM_ADMIN",
    };
    groupMappingCreate.mockResolvedValue(mockMapping);

    const result = await createGroupMapping(
      {
        ssoProviderId: "provider-1",
        externalGroup: "admins",
        targetType: "GLOBAL_ROLE",
        targetValue: "PLATFORM_ADMIN",
      },
      actorId,
    );

    expect(result).toEqual(mockMapping);
  });

  it("creates a user_group mapping", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    userGroupFindUnique.mockResolvedValue({ id: "group-1", name: "Engineering" });
    const mockMapping = {
      id: "gm-2",
      ssoProviderId: "provider-1",
      externalGroup: "engineering",
      targetType: "USER_GROUP",
      targetValue: "group-1",
    };
    groupMappingCreate.mockResolvedValue(mockMapping);

    const result = await createGroupMapping(
      {
        ssoProviderId: "provider-1",
        externalGroup: "engineering",
        targetType: "USER_GROUP",
        targetValue: "group-1",
      },
      actorId,
    );

    expect(result).toEqual(mockMapping);
  });

  it("throws INVALID_TARGET_VALUE for invalid global role", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);

    await expect(
      createGroupMapping(
        {
          ssoProviderId: "provider-1",
          externalGroup: "admins",
          targetType: "GLOBAL_ROLE",
          targetValue: "INVALID_ROLE",
        },
        actorId,
      ),
    ).rejects.toThrow(SsoServiceError);
  });

  it("throws GROUP_NOT_FOUND for nonexistent user group", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    userGroupFindUnique.mockResolvedValue(null);

    await expect(
      createGroupMapping(
        {
          ssoProviderId: "provider-1",
          externalGroup: "engineering",
          targetType: "USER_GROUP",
          targetValue: "nonexistent",
        },
        actorId,
      ),
    ).rejects.toThrow(SsoServiceError);
  });
});

describe("updateGroupMapping", () => {
  it("updates a mapping", async () => {
    groupMappingFindUnique.mockResolvedValue({
      id: "gm-1",
      ssoProviderId: "provider-1",
      externalGroup: "admins",
      targetType: "GLOBAL_ROLE",
      targetValue: "PLATFORM_ADMIN",
    });
    groupMappingUpdate.mockResolvedValue({
      id: "gm-1",
      ssoProviderId: "provider-1",
      externalGroup: "super-admins",
      targetType: "GLOBAL_ROLE",
      targetValue: "PLATFORM_ADMIN",
    });

    const result = await updateGroupMapping({ id: "gm-1", externalGroup: "super-admins" }, actorId);

    expect(result.externalGroup).toBe("super-admins");
  });
});

describe("deleteGroupMapping", () => {
  it("deletes a mapping", async () => {
    groupMappingFindUnique.mockResolvedValue({
      id: "gm-1",
      ssoProviderId: "provider-1",
    });
    groupMappingDelete.mockResolvedValue(undefined);

    await deleteGroupMapping("gm-1", actorId);

    expect(groupMappingDelete).toHaveBeenCalledWith({ where: { id: "gm-1" } });
  });
});

describe("listGroupMappings", () => {
  it("lists mappings for a provider", async () => {
    providerFindUnique.mockResolvedValue(mockSamlProvider);
    groupMappingFindMany.mockResolvedValue([
      {
        id: "gm-1",
        ssoProviderId: "provider-1",
        externalGroup: "admins",
        targetType: "GLOBAL_ROLE",
        targetValue: "PLATFORM_ADMIN",
      },
    ]);

    const result = await listGroupMappings("provider-1");

    expect(result).toHaveLength(1);
  });
});

// ── Enabled Providers ───────────────────────────────────────────

describe("getEnabledSsoProviders", () => {
  it("returns only enabled providers with limited fields", async () => {
    providerFindMany.mockResolvedValue([
      { id: "provider-1", name: "okta-saml", displayName: "Okta SAML", type: "SAML" },
    ]);

    const result = await getEnabledSsoProviders();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "provider-1",
      name: "okta-saml",
      displayName: "Okta SAML",
      type: "SAML",
    });
  });
});
