import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  SsoProviderCreateInput,
  SsoProviderUpdateInput,
  SsoProviderListInput,
  AttributeMappingCreateInput,
  AttributeMappingUpdateInput,
  GroupMappingCreateInput,
  GroupMappingUpdateInput,
} from "./sso.schemas";
import type { SsoProviderType, GlobalRole } from "@prisma/client";

// ── Error Class ─────────────────────────────────────────────────

export class SsoServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "SsoServiceError";
    this.code = code;
  }
}

// ── Provider CRUD ───────────────────────────────────────────────

export async function createSsoProvider(input: SsoProviderCreateInput, actorId: string) {
  const existing = await prisma.ssoProvider.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw new SsoServiceError("An SSO provider with this name already exists", "NAME_EXISTS");
  }

  const samlFields =
    input.type === "SAML" && input.saml
      ? {
          samlEntityId: input.saml.samlEntityId,
          samlSsoUrl: input.saml.samlSsoUrl,
          samlSloUrl: input.saml.samlSloUrl,
          samlCertificate: input.saml.samlCertificate,
          samlMetadataUrl: input.saml.samlMetadataUrl,
          samlSignRequests: input.saml.samlSignRequests,
          samlWantAssertionsSigned: input.saml.samlWantAssertionsSigned,
        }
      : {};

  const ldapFields =
    input.type === "LDAP" && input.ldap
      ? {
          ldapUrl: input.ldap.ldapUrl,
          ldapBindDn: input.ldap.ldapBindDn,
          ldapBindCredential: input.ldap.ldapBindCredential,
          ldapSearchBase: input.ldap.ldapSearchBase,
          ldapSearchFilter: input.ldap.ldapSearchFilter,
          ldapUseTls: input.ldap.ldapUseTls,
          ldapGroupSearchBase: input.ldap.ldapGroupSearchBase,
          ldapGroupSearchFilter: input.ldap.ldapGroupSearchFilter,
        }
      : {};

  const provider = await prisma.ssoProvider.create({
    data: {
      name: input.name,
      displayName: input.displayName,
      type: input.type as SsoProviderType,
      isEnabled: input.isEnabled,
      autoProvisionUsers: input.autoProvisionUsers,
      defaultRole: input.defaultRole as GlobalRole,
      ...samlFields,
      ...ldapFields,
    },
    include: {
      attributeMappings: true,
      groupMappings: true,
    },
  });

  logger.info({ providerId: provider.id, type: provider.type }, "SSO provider created");

  eventBus.emit("sso.providerCreated", {
    entity: "ssoProvider",
    entityId: provider.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: provider.name, type: provider.type },
  });

  return provider;
}

export async function updateSsoProvider(input: SsoProviderUpdateInput, actorId: string) {
  const existing = await prisma.ssoProvider.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  const samlFields =
    input.saml && existing.type === "SAML"
      ? {
          samlEntityId: input.saml.samlEntityId,
          samlSsoUrl: input.saml.samlSsoUrl,
          samlSloUrl: input.saml.samlSloUrl,
          samlCertificate: input.saml.samlCertificate,
          samlMetadataUrl: input.saml.samlMetadataUrl,
          samlSignRequests: input.saml.samlSignRequests,
          samlWantAssertionsSigned: input.saml.samlWantAssertionsSigned,
        }
      : {};

  const ldapFields =
    input.ldap && existing.type === "LDAP"
      ? {
          ldapUrl: input.ldap.ldapUrl,
          ldapBindDn: input.ldap.ldapBindDn,
          ldapBindCredential: input.ldap.ldapBindCredential,
          ldapSearchBase: input.ldap.ldapSearchBase,
          ldapSearchFilter: input.ldap.ldapSearchFilter,
          ldapUseTls: input.ldap.ldapUseTls,
          ldapGroupSearchBase: input.ldap.ldapGroupSearchBase,
          ldapGroupSearchFilter: input.ldap.ldapGroupSearchFilter,
        }
      : {};

  const provider = await prisma.ssoProvider.update({
    where: { id: input.id },
    data: {
      displayName: input.displayName,
      isEnabled: input.isEnabled,
      autoProvisionUsers: input.autoProvisionUsers,
      defaultRole: input.defaultRole as GlobalRole | undefined,
      ...samlFields,
      ...ldapFields,
    },
    include: {
      attributeMappings: true,
      groupMappings: true,
    },
  });

  logger.info({ providerId: provider.id }, "SSO provider updated");

  eventBus.emit("sso.providerUpdated", {
    entity: "ssoProvider",
    entityId: provider.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: provider.name },
  });

  return provider;
}

export async function deleteSsoProvider(id: string, actorId: string) {
  const existing = await prisma.ssoProvider.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  if (existing.isEnabled) {
    throw new SsoServiceError(
      "Cannot delete an enabled SSO provider. Disable it first.",
      "PROVIDER_ENABLED",
    );
  }

  await prisma.ssoProvider.delete({ where: { id } });

  logger.info({ providerId: id }, "SSO provider deleted");

  eventBus.emit("sso.providerDeleted", {
    entity: "ssoProvider",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: existing.name, type: existing.type },
  });
}

export async function getSsoProviderById(id: string) {
  const provider = await prisma.ssoProvider.findUnique({
    where: { id },
    include: {
      attributeMappings: true,
      groupMappings: true,
    },
  });

  if (!provider) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  return sanitizeProvider(provider);
}

export async function listSsoProviders(input: SsoProviderListInput) {
  const { cursor, limit, type } = input;

  const where = type ? { type: type as SsoProviderType } : {};

  const providers = await prisma.ssoProvider.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      attributeMappings: true,
      groupMappings: true,
    },
  });

  let nextCursor: string | undefined;
  if (providers.length > limit) {
    const next = providers.pop();
    nextCursor = next?.id;
  }

  return {
    items: providers.map(sanitizeProvider),
    nextCursor,
  };
}

export async function toggleSsoProvider(id: string, isEnabled: boolean, actorId: string) {
  const existing = await prisma.ssoProvider.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  if (isEnabled) {
    validateProviderConfig(existing);
  }

  const provider = await prisma.ssoProvider.update({
    where: { id },
    data: { isEnabled },
    include: {
      attributeMappings: true,
      groupMappings: true,
    },
  });

  const eventName = isEnabled ? "sso.providerEnabled" : "sso.providerDisabled";
  logger.info({ providerId: id, isEnabled }, "SSO provider toggled");

  eventBus.emit(eventName, {
    entity: "ssoProvider",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: provider.name, isEnabled },
  });

  return sanitizeProvider(provider);
}

// ── Attribute Mapping CRUD ──────────────────────────────────────

export async function createAttributeMapping(input: AttributeMappingCreateInput, actorId: string) {
  const provider = await prisma.ssoProvider.findUnique({
    where: { id: input.ssoProviderId },
  });

  if (!provider) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  const mapping = await prisma.ssoAttributeMapping.create({
    data: {
      ssoProviderId: input.ssoProviderId,
      sourceAttribute: input.sourceAttribute,
      targetField: input.targetField,
    },
  });

  logger.info(
    { mappingId: mapping.id, providerId: input.ssoProviderId },
    "Attribute mapping created",
  );

  eventBus.emit("sso.providerUpdated", {
    entity: "ssoAttributeMapping",
    entityId: mapping.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { ssoProviderId: input.ssoProviderId, targetField: input.targetField },
  });

  return mapping;
}

export async function updateAttributeMapping(input: AttributeMappingUpdateInput, actorId: string) {
  const existing = await prisma.ssoAttributeMapping.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new SsoServiceError("Attribute mapping not found", "MAPPING_NOT_FOUND");
  }

  const mapping = await prisma.ssoAttributeMapping.update({
    where: { id: input.id },
    data: {
      sourceAttribute: input.sourceAttribute,
      targetField: input.targetField,
    },
  });

  logger.info({ mappingId: mapping.id }, "Attribute mapping updated");

  eventBus.emit("sso.providerUpdated", {
    entity: "ssoAttributeMapping",
    entityId: mapping.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { targetField: mapping.targetField },
  });

  return mapping;
}

export async function deleteAttributeMapping(id: string, actorId: string) {
  const existing = await prisma.ssoAttributeMapping.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SsoServiceError("Attribute mapping not found", "MAPPING_NOT_FOUND");
  }

  await prisma.ssoAttributeMapping.delete({ where: { id } });

  logger.info({ mappingId: id }, "Attribute mapping deleted");

  eventBus.emit("sso.providerUpdated", {
    entity: "ssoAttributeMapping",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { ssoProviderId: existing.ssoProviderId },
  });
}

export async function listAttributeMappings(ssoProviderId: string) {
  const provider = await prisma.ssoProvider.findUnique({
    where: { id: ssoProviderId },
  });

  if (!provider) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  return prisma.ssoAttributeMapping.findMany({
    where: { ssoProviderId },
    orderBy: { targetField: "asc" },
  });
}

// ── Group Mapping CRUD ──────────────────────────────────────────

export async function createGroupMapping(input: GroupMappingCreateInput, actorId: string) {
  const provider = await prisma.ssoProvider.findUnique({
    where: { id: input.ssoProviderId },
  });

  if (!provider) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  if (input.targetType === "global_role") {
    const validRoles = ["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"];
    if (!validRoles.includes(input.targetValue)) {
      throw new SsoServiceError(
        `Invalid global role: ${input.targetValue}. Valid roles: ${validRoles.join(", ")}`,
        "INVALID_TARGET_VALUE",
      );
    }
  }

  if (input.targetType === "user_group") {
    const group = await prisma.userGroup.findUnique({
      where: { id: input.targetValue },
    });
    if (!group) {
      throw new SsoServiceError("Target user group not found", "GROUP_NOT_FOUND");
    }
  }

  const mapping = await prisma.ssoGroupMapping.create({
    data: {
      ssoProviderId: input.ssoProviderId,
      externalGroup: input.externalGroup,
      targetType: input.targetType,
      targetValue: input.targetValue,
    },
  });

  logger.info({ mappingId: mapping.id, providerId: input.ssoProviderId }, "Group mapping created");

  eventBus.emit("sso.groupSynced", {
    entity: "ssoGroupMapping",
    entityId: mapping.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { externalGroup: input.externalGroup, targetType: input.targetType },
  });

  return mapping;
}

export async function updateGroupMapping(input: GroupMappingUpdateInput, actorId: string) {
  const existing = await prisma.ssoGroupMapping.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new SsoServiceError("Group mapping not found", "MAPPING_NOT_FOUND");
  }

  const targetType = input.targetType ?? existing.targetType;
  const targetValue = input.targetValue ?? existing.targetValue;

  if (targetType === "global_role") {
    const validRoles = ["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"];
    if (!validRoles.includes(targetValue)) {
      throw new SsoServiceError(`Invalid global role: ${targetValue}`, "INVALID_TARGET_VALUE");
    }
  }

  if (targetType === "user_group") {
    const group = await prisma.userGroup.findUnique({
      where: { id: targetValue },
    });
    if (!group) {
      throw new SsoServiceError("Target user group not found", "GROUP_NOT_FOUND");
    }
  }

  const mapping = await prisma.ssoGroupMapping.update({
    where: { id: input.id },
    data: {
      externalGroup: input.externalGroup,
      targetType: input.targetType,
      targetValue: input.targetValue,
    },
  });

  logger.info({ mappingId: mapping.id }, "Group mapping updated");

  eventBus.emit("sso.groupSynced", {
    entity: "ssoGroupMapping",
    entityId: mapping.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { externalGroup: mapping.externalGroup },
  });

  return mapping;
}

export async function deleteGroupMapping(id: string, actorId: string) {
  const existing = await prisma.ssoGroupMapping.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SsoServiceError("Group mapping not found", "MAPPING_NOT_FOUND");
  }

  await prisma.ssoGroupMapping.delete({ where: { id } });

  logger.info({ mappingId: id }, "Group mapping deleted");

  eventBus.emit("sso.groupSynced", {
    entity: "ssoGroupMapping",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { ssoProviderId: existing.ssoProviderId },
  });
}

export async function listGroupMappings(ssoProviderId: string) {
  const provider = await prisma.ssoProvider.findUnique({
    where: { id: ssoProviderId },
  });

  if (!provider) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  return prisma.ssoGroupMapping.findMany({
    where: { ssoProviderId },
    orderBy: { externalGroup: "asc" },
  });
}

// ── Enabled Providers Query ─────────────────────────────────────

export async function getEnabledSsoProviders() {
  const providers = await prisma.ssoProvider.findMany({
    where: { isEnabled: true },
    select: {
      id: true,
      name: true,
      displayName: true,
      type: true,
    },
    orderBy: { displayName: "asc" },
  });

  return providers;
}

// ── Helpers ─────────────────────────────────────────────────────

interface ProviderWithRelations {
  id: string;
  name: string;
  displayName: string;
  type: SsoProviderType;
  isEnabled: boolean;
  samlEntityId: string | null;
  samlSsoUrl: string | null;
  samlSloUrl: string | null;
  samlCertificate: string | null;
  samlMetadataUrl: string | null;
  samlSignRequests: boolean;
  samlWantAssertionsSigned: boolean;
  ldapUrl: string | null;
  ldapBindDn: string | null;
  ldapBindCredential: string | null;
  ldapSearchBase: string | null;
  ldapSearchFilter: string | null;
  ldapUseTls: boolean;
  ldapGroupSearchBase: string | null;
  ldapGroupSearchFilter: string | null;
  autoProvisionUsers: boolean;
  defaultRole: GlobalRole;
  createdAt: Date;
  updatedAt: Date;
  attributeMappings: Array<{
    id: string;
    ssoProviderId: string;
    sourceAttribute: string;
    targetField: string;
  }>;
  groupMappings: Array<{
    id: string;
    ssoProviderId: string;
    externalGroup: string;
    targetType: string;
    targetValue: string;
  }>;
}

function sanitizeProvider(provider: ProviderWithRelations) {
  return {
    ...provider,
    ldapBindCredential: provider.ldapBindCredential ? "********" : null,
    samlCertificate: provider.samlCertificate ? "[CONFIGURED]" : null,
  };
}

function validateProviderConfig(provider: {
  type: SsoProviderType;
  samlEntityId: string | null;
  samlSsoUrl: string | null;
  samlCertificate: string | null;
  ldapUrl: string | null;
  ldapBindDn: string | null;
  ldapBindCredential: string | null;
  ldapSearchBase: string | null;
}) {
  if (provider.type === "SAML") {
    if (!provider.samlEntityId || !provider.samlSsoUrl || !provider.samlCertificate) {
      throw new SsoServiceError(
        "SAML provider requires entityId, SSO URL, and certificate to be enabled",
        "INCOMPLETE_CONFIG",
      );
    }
  }

  if (provider.type === "LDAP") {
    if (
      !provider.ldapUrl ||
      !provider.ldapBindDn ||
      !provider.ldapBindCredential ||
      !provider.ldapSearchBase
    ) {
      throw new SsoServiceError(
        "LDAP provider requires URL, bind DN, bind credential, and search base to be enabled",
        "INCOMPLETE_CONFIG",
      );
    }
  }
}
