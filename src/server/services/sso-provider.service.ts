import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  SsoProviderCreateInput,
  SsoProviderUpdateInput,
  SsoProviderListInput,
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
      type: input.type,
      isEnabled: input.isEnabled,
      autoProvisionUsers: input.autoProvisionUsers,
      defaultRole: input.defaultRole,
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
      defaultRole: input.defaultRole,
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

  const where = type ? { type } : {};

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
