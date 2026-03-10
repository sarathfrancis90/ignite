import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { GlobalRole, SsoGroupMappingTargetType } from "@prisma/client";
import type { SsoProviderType } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────

export interface SsoUserProfile {
  providerId: string;
  externalId: string;
  attributes: Record<string, string>;
  groups: string[];
}

interface ProviderConfig {
  id: string;
  name: string;
  type: SsoProviderType;
  autoProvisionUsers: boolean;
  defaultRole: GlobalRole;
  attributeMappings: Array<{
    sourceAttribute: string;
    targetField: string;
  }>;
  groupMappings: Array<{
    externalGroup: string;
    targetType: SsoGroupMappingTargetType;
    targetValue: string;
  }>;
}

// ── SSO Authentication ──────────────────────────────────────────

export async function authenticateSsoUser(profile: SsoUserProfile) {
  const provider = await prisma.ssoProvider.findUnique({
    where: { id: profile.providerId },
    include: {
      attributeMappings: true,
      groupMappings: true,
    },
  });

  if (!provider || !provider.isEnabled) {
    logger.warn({ providerId: profile.providerId }, "SSO login attempted with disabled provider");
    return null;
  }

  const mappedAttributes = mapAttributes(profile.attributes, provider.attributeMappings);
  const email = mappedAttributes.email;

  if (!email) {
    logger.warn({ providerId: profile.providerId }, "SSO profile missing email attribute");
    return null;
  }

  const normalizedEmail = email.toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user && provider.autoProvisionUsers) {
    user = await provisionUser(normalizedEmail, mappedAttributes, provider);
  }

  if (!user) {
    logger.warn({ email: normalizedEmail }, "SSO user not found and auto-provisioning disabled");
    return null;
  }

  if (!user.isActive) {
    logger.warn({ userId: user.id }, "SSO login attempted by deactivated user");
    return null;
  }

  await updateUserAttributes(user.id, mappedAttributes);
  await syncGroups(user.id, profile.groups, provider);

  logger.info({ userId: user.id, providerId: provider.id }, "User authenticated via SSO");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

// ── User Provisioning ───────────────────────────────────────────

async function provisionUser(
  email: string,
  attributes: MappedAttributes,
  provider: ProviderConfig,
) {
  const user = await prisma.user.create({
    data: {
      email,
      name: attributes.name ?? email.split("@")[0],
      image: attributes.image,
      bio: attributes.bio,
      globalRole: provider.defaultRole,
    },
  });

  logger.info({ userId: user.id, providerId: provider.id }, "SSO user auto-provisioned");

  eventBus.emit("sso.userProvisioned", {
    entity: "user",
    entityId: user.id,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: {
      email,
      providerId: provider.id,
      providerName: provider.name,
    },
  });

  return user;
}

// ── Attribute Mapping ───────────────────────────────────────────

interface MappedAttributes {
  email?: string;
  name?: string;
  image?: string;
  bio?: string;
  skills?: string;
}

const VALID_TARGET_FIELDS: ReadonlySet<string> = new Set([
  "email",
  "name",
  "image",
  "bio",
  "skills",
]);

function mapAttributes(
  rawAttributes: Record<string, string>,
  mappings: Array<{ sourceAttribute: string; targetField: string }>,
): MappedAttributes {
  const mapped: MappedAttributes = {};

  for (const mapping of mappings) {
    const value = rawAttributes[mapping.sourceAttribute];
    if (value !== undefined && VALID_TARGET_FIELDS.has(mapping.targetField)) {
      mapped[mapping.targetField as keyof MappedAttributes] = value;
    }
  }

  if (!mapped.email && rawAttributes["email"]) {
    mapped.email = rawAttributes["email"];
  }

  return mapped;
}

interface UserAttributeUpdate {
  name?: string;
  image?: string;
  bio?: string;
  skills?: string[];
}

async function updateUserAttributes(userId: string, attributes: MappedAttributes) {
  const updateData: UserAttributeUpdate = {};

  if (attributes.name) updateData.name = attributes.name;
  if (attributes.image) updateData.image = attributes.image;
  if (attributes.bio) updateData.bio = attributes.bio;
  if (attributes.skills) {
    updateData.skills = attributes.skills.split(",").map((s) => s.trim());
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }
}

// ── Group Sync ──────────────────────────────────────────────────

const VALID_GLOBAL_ROLES: ReadonlySet<string> = new Set([
  GlobalRole.PLATFORM_ADMIN,
  GlobalRole.INNOVATION_MANAGER,
  GlobalRole.MEMBER,
]);

async function syncGroups(userId: string, externalGroups: string[], provider: ProviderConfig) {
  if (provider.groupMappings.length === 0 || externalGroups.length === 0) {
    return;
  }

  for (const mapping of provider.groupMappings) {
    const isMember = externalGroups.includes(mapping.externalGroup);

    if (mapping.targetType === SsoGroupMappingTargetType.GLOBAL_ROLE && isMember) {
      if (VALID_GLOBAL_ROLES.has(mapping.targetValue)) {
        await syncGlobalRole(userId, mapping.targetValue as GlobalRole);
      }
    }

    if (mapping.targetType === SsoGroupMappingTargetType.USER_GROUP) {
      await syncUserGroup(userId, mapping.targetValue, isMember);
    }
  }

  eventBus.emit("sso.groupSynced", {
    entity: "user",
    entityId: userId,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: {
      providerId: provider.id,
      externalGroups,
    },
  });
}

async function syncGlobalRole(userId: string, role: GlobalRole) {
  await prisma.user.update({
    where: { id: userId },
    data: { globalRole: role },
  });
}

async function syncUserGroup(userId: string, groupId: string, shouldBeMember: boolean) {
  const group = await prisma.userGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) return;

  const existingMembership = await prisma.userGroupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (shouldBeMember && !existingMembership) {
    await prisma.userGroupMembership.create({
      data: { userId, groupId },
    });
  }

  if (!shouldBeMember && existingMembership) {
    await prisma.userGroupMembership.delete({
      where: { id: existingMembership.id },
    });
  }
}
