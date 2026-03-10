import { z } from "zod";

// ── SSO Provider Schemas ───────────────────────────────────────

export const ssoProviderType = z.enum(["SAML", "LDAP"]);

export const samlConfigInput = z.object({
  samlEntityId: z.string().min(1, "Entity ID is required").max(500),
  samlSsoUrl: z.string().url("Must be a valid URL").max(500),
  samlSloUrl: z.string().url("Must be a valid URL").max(500).optional(),
  samlCertificate: z.string().min(1, "Certificate is required"),
  samlMetadataUrl: z.string().url("Must be a valid URL").max(500).optional(),
  samlSignRequests: z.boolean().default(false),
  samlWantAssertionsSigned: z.boolean().default(true),
});

export const ldapConfigInput = z.object({
  ldapUrl: z.string().min(1, "LDAP URL is required").max(500),
  ldapBindDn: z.string().min(1, "Bind DN is required").max(500),
  ldapBindCredential: z.string().min(1, "Bind credential is required"),
  ldapSearchBase: z.string().min(1, "Search base is required").max(500),
  ldapSearchFilter: z.string().max(500).default("(uid={{username}})"),
  ldapUseTls: z.boolean().default(false),
  ldapGroupSearchBase: z.string().max(500).optional(),
  ldapGroupSearchFilter: z.string().max(500).optional(),
});

export const ssoProviderCreateInput = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(200)
      .regex(/^[a-z0-9-]+$/, "Name must be lowercase alphanumeric with hyphens"),
    displayName: z.string().min(1, "Display name is required").max(200),
    type: ssoProviderType,
    isEnabled: z.boolean().default(false),
    autoProvisionUsers: z.boolean().default(true),
    defaultRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).default("MEMBER"),
    saml: samlConfigInput.optional(),
    ldap: ldapConfigInput.optional(),
  })
  .refine(
    (data) => {
      if (data.type === "SAML") return !!data.saml;
      if (data.type === "LDAP") return !!data.ldap;
      return false;
    },
    { message: "Configuration must match provider type" },
  );

export const ssoProviderUpdateInput = z.object({
  id: z.string().cuid(),
  displayName: z.string().min(1).max(200).optional(),
  isEnabled: z.boolean().optional(),
  autoProvisionUsers: z.boolean().optional(),
  defaultRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).optional(),
  saml: samlConfigInput.partial().optional(),
  ldap: ldapConfigInput.partial().optional(),
});

export const ssoProviderGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const ssoProviderDeleteInput = z.object({
  id: z.string().cuid(),
});

export const ssoProviderListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  type: ssoProviderType.optional(),
});

export const ssoProviderToggleInput = z.object({
  id: z.string().cuid(),
  isEnabled: z.boolean(),
});

// ── Attribute Mapping Schemas ────────────────────────────────────

export const attributeMappingCreateInput = z.object({
  ssoProviderId: z.string().cuid(),
  sourceAttribute: z.string().min(1, "Source attribute is required").max(200),
  targetField: z.enum(["email", "name", "image", "bio", "skills"]),
});

export const attributeMappingUpdateInput = z.object({
  id: z.string().cuid(),
  sourceAttribute: z.string().min(1).max(200).optional(),
  targetField: z.enum(["email", "name", "image", "bio", "skills"]).optional(),
});

export const attributeMappingDeleteInput = z.object({
  id: z.string().cuid(),
});

export const attributeMappingListInput = z.object({
  ssoProviderId: z.string().cuid(),
});

// ── Group Mapping Schemas ─────────────────────────────────────────

export const groupMappingTargetType = z.enum(["global_role", "user_group"]);

export const groupMappingCreateInput = z.object({
  ssoProviderId: z.string().cuid(),
  externalGroup: z.string().min(1, "External group is required").max(500),
  targetType: groupMappingTargetType,
  targetValue: z.string().min(1, "Target value is required").max(200),
});

export const groupMappingUpdateInput = z.object({
  id: z.string().cuid(),
  externalGroup: z.string().min(1).max(500).optional(),
  targetType: groupMappingTargetType.optional(),
  targetValue: z.string().min(1).max(200).optional(),
});

export const groupMappingDeleteInput = z.object({
  id: z.string().cuid(),
});

export const groupMappingListInput = z.object({
  ssoProviderId: z.string().cuid(),
});

// ── Test Connection Schema ────────────────────────────────────────

export const ssoTestConnectionInput = z.object({
  id: z.string().cuid(),
});

// ── Type Exports ──────────────────────────────────────────────────

export type SsoProviderCreateInput = z.infer<typeof ssoProviderCreateInput>;
export type SsoProviderUpdateInput = z.infer<typeof ssoProviderUpdateInput>;
export type SsoProviderListInput = z.infer<typeof ssoProviderListInput>;
export type AttributeMappingCreateInput = z.infer<typeof attributeMappingCreateInput>;
export type AttributeMappingUpdateInput = z.infer<typeof attributeMappingUpdateInput>;
export type GroupMappingCreateInput = z.infer<typeof groupMappingCreateInput>;
export type GroupMappingUpdateInput = z.infer<typeof groupMappingUpdateInput>;
