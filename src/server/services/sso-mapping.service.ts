import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { SsoServiceError } from "./sso-provider.service";
import type {
  AttributeMappingCreateInput,
  AttributeMappingUpdateInput,
  GroupMappingCreateInput,
  GroupMappingUpdateInput,
} from "./sso.schemas";
import { GlobalRole, SsoGroupMappingTargetType } from "@prisma/client";

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

const VALID_GLOBAL_ROLES: readonly string[] = [
  GlobalRole.PLATFORM_ADMIN,
  GlobalRole.INNOVATION_MANAGER,
  GlobalRole.MEMBER,
];

export async function createGroupMapping(input: GroupMappingCreateInput, actorId: string) {
  const provider = await prisma.ssoProvider.findUnique({
    where: { id: input.ssoProviderId },
  });

  if (!provider) {
    throw new SsoServiceError("SSO provider not found", "PROVIDER_NOT_FOUND");
  }

  if (input.targetType === SsoGroupMappingTargetType.GLOBAL_ROLE) {
    if (!VALID_GLOBAL_ROLES.includes(input.targetValue)) {
      throw new SsoServiceError(
        `Invalid global role: ${input.targetValue}. Valid roles: ${VALID_GLOBAL_ROLES.join(", ")}`,
        "INVALID_TARGET_VALUE",
      );
    }
  }

  if (input.targetType === SsoGroupMappingTargetType.USER_GROUP) {
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

  if (targetType === SsoGroupMappingTargetType.GLOBAL_ROLE) {
    if (!VALID_GLOBAL_ROLES.includes(targetValue)) {
      throw new SsoServiceError(`Invalid global role: ${targetValue}`, "INVALID_TARGET_VALUE");
    }
  }

  if (targetType === SsoGroupMappingTargetType.USER_GROUP) {
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
