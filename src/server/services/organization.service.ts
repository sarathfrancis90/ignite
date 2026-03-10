import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  OrganizationListInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
} from "./organization.schemas";

export {
  organizationListInput,
  organizationCreateInput,
  organizationUpdateInput,
  organizationGetByIdInput,
  organizationDeleteInput,
} from "./organization.schemas";

export type {
  OrganizationListInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
} from "./organization.schemas";

export {
  contactListInput,
  contactCreateInput,
  contactUpdateInput,
  contactDeleteInput,
  contactInviteInput,
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  markContactInvited,
} from "./contact.service";

type JsonSafe = Record<string, string> | null;

const childLogger = logger.child({ service: "organization" });

export async function listOrganizations(input: OrganizationListInput) {
  const where: Prisma.OrganizationWhereInput = {};

  if (input.relationshipStatus) {
    where.relationshipStatus = input.relationshipStatus;
  }

  if (input.industry) {
    where.industry = { contains: input.industry, mode: "insensitive" };
  }

  if (input.isConfidential !== undefined) {
    where.isConfidential = input.isConfidential;
  }

  if (input.isArchived !== undefined) {
    where.isArchived = input.isArchived;
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
      { industry: { contains: input.search, mode: "insensitive" } },
      { location: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.organization.findMany({
    where,
    include: {
      _count: { select: { contacts: true } },
      managers: {
        include: { user: { select: { id: true, name: true, email: true } } },
        take: 3,
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { name: "asc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      websiteUrl: org.websiteUrl,
      logoUrl: org.logoUrl,
      industry: org.industry,
      location: org.location,
      fundingStage: org.fundingStage,
      fundingTotal: org.fundingTotal,
      relationshipStatus: org.relationshipStatus,
      ndaStatus: org.ndaStatus,
      isConfidential: org.isConfidential,
      isArchived: org.isArchived,
      contactCount: org._count.contacts,
      managers: org.managers.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
      })),
      customFields: org.customFields as JsonSafe,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getOrganizationById(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
      },
      managers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { contacts: true } },
    },
  });

  if (!org) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    websiteUrl: org.websiteUrl,
    logoUrl: org.logoUrl,
    industry: org.industry,
    location: org.location,
    foundedYear: org.foundedYear,
    employeeCount: org.employeeCount,
    fundingStage: org.fundingStage,
    fundingTotal: org.fundingTotal,
    relationshipStatus: org.relationshipStatus,
    ndaStatus: org.ndaStatus,
    isConfidential: org.isConfidential,
    isArchived: org.isArchived,
    crunchbaseId: org.crunchbaseId,
    innospotId: org.innospotId,
    customFields: org.customFields as JsonSafe,
    managementTeam: org.managementTeam as JsonSafe,
    contactCount: org._count.contacts,
    contacts: org.contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      title: c.title,
      isPrimary: c.isPrimary,
      invitationStatus: c.invitationStatus,
      linkedUserId: c.linkedUserId,
      createdAt: c.createdAt.toISOString(),
    })),
    managers: org.managers.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
      assignedAt: m.assignedAt.toISOString(),
    })),
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function createOrganization(input: OrganizationCreateInput, actorId: string) {
  if (input.crunchbaseId) {
    const existing = await prisma.organization.findUnique({
      where: { crunchbaseId: input.crunchbaseId },
      select: { id: true },
    });
    if (existing) {
      throw new OrganizationServiceError(
        "An organization with this Crunchbase ID already exists",
        "DUPLICATE_CRUNCHBASE_ID",
      );
    }
  }

  const org = await prisma.organization.create({
    data: {
      name: input.name,
      description: input.description,
      websiteUrl: input.websiteUrl,
      logoUrl: input.logoUrl,
      industry: input.industry,
      location: input.location,
      foundedYear: input.foundedYear,
      employeeCount: input.employeeCount,
      fundingStage: input.fundingStage,
      fundingTotal: input.fundingTotal,
      relationshipStatus: input.relationshipStatus,
      ndaStatus: input.ndaStatus,
      isConfidential: input.isConfidential,
      crunchbaseId: input.crunchbaseId,
      innospotId: input.innospotId,
      customFields: input.customFields,
      managementTeam: input.managementTeam,
      managers: {
        create: {
          userId: actorId,
          role: "INTERNAL_MANAGER",
        },
      },
    },
    include: {
      _count: { select: { contacts: true } },
      managers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  childLogger.info({ organizationId: org.id, actorId }, "Organization created");

  eventBus.emit("organization.created", {
    entity: "organization",
    entityId: org.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: org.name, relationshipStatus: org.relationshipStatus },
  });

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    websiteUrl: org.websiteUrl,
    logoUrl: org.logoUrl,
    industry: org.industry,
    location: org.location,
    foundedYear: org.foundedYear,
    employeeCount: org.employeeCount,
    fundingStage: org.fundingStage,
    fundingTotal: org.fundingTotal,
    relationshipStatus: org.relationshipStatus,
    ndaStatus: org.ndaStatus,
    isConfidential: org.isConfidential,
    isArchived: org.isArchived,
    crunchbaseId: org.crunchbaseId,
    innospotId: org.innospotId,
    customFields: org.customFields as JsonSafe,
    managementTeam: org.managementTeam as JsonSafe,
    contactCount: org._count.contacts,
    managers: org.managers.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
    })),
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function updateOrganization(input: OrganizationUpdateInput, actorId: string) {
  const existing = await prisma.organization.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  if (input.crunchbaseId !== undefined && input.crunchbaseId !== null) {
    const dup = await prisma.organization.findFirst({
      where: { crunchbaseId: input.crunchbaseId, id: { not: input.id } },
      select: { id: true },
    });
    if (dup) {
      throw new OrganizationServiceError(
        "An organization with this Crunchbase ID already exists",
        "DUPLICATE_CRUNCHBASE_ID",
      );
    }
  }

  const data: Prisma.OrganizationUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.websiteUrl !== undefined) data.websiteUrl = input.websiteUrl;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.location !== undefined) data.location = input.location;
  if (input.foundedYear !== undefined) data.foundedYear = input.foundedYear;
  if (input.employeeCount !== undefined) data.employeeCount = input.employeeCount;
  if (input.fundingStage !== undefined) data.fundingStage = input.fundingStage;
  if (input.fundingTotal !== undefined) data.fundingTotal = input.fundingTotal;
  if (input.relationshipStatus !== undefined) data.relationshipStatus = input.relationshipStatus;
  if (input.ndaStatus !== undefined) data.ndaStatus = input.ndaStatus;
  if (input.isConfidential !== undefined) data.isConfidential = input.isConfidential;
  if (input.crunchbaseId !== undefined) data.crunchbaseId = input.crunchbaseId;
  if (input.innospotId !== undefined) data.innospotId = input.innospotId;
  if (input.customFields !== undefined)
    data.customFields = input.customFields === null ? Prisma.DbNull : input.customFields;
  if (input.managementTeam !== undefined)
    data.managementTeam = input.managementTeam === null ? Prisma.DbNull : input.managementTeam;

  const org = await prisma.organization.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { contacts: true } },
      managers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  childLogger.info({ organizationId: org.id, actorId }, "Organization updated");

  eventBus.emit("organization.updated", {
    entity: "organization",
    entityId: org.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    websiteUrl: org.websiteUrl,
    logoUrl: org.logoUrl,
    industry: org.industry,
    location: org.location,
    foundedYear: org.foundedYear,
    employeeCount: org.employeeCount,
    fundingStage: org.fundingStage,
    fundingTotal: org.fundingTotal,
    relationshipStatus: org.relationshipStatus,
    ndaStatus: org.ndaStatus,
    isConfidential: org.isConfidential,
    isArchived: org.isArchived,
    crunchbaseId: org.crunchbaseId,
    innospotId: org.innospotId,
    customFields: org.customFields as JsonSafe,
    managementTeam: org.managementTeam as JsonSafe,
    contactCount: org._count.contacts,
    managers: org.managers.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
    })),
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function deleteOrganization(id: string, actorId: string) {
  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!existing) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  await prisma.organization.delete({ where: { id } });

  childLogger.info({ organizationId: id, actorId }, "Organization deleted");

  eventBus.emit("organization.archived", {
    entity: "organization",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: existing.name },
  });

  return { id };
}

export async function checkDuplicateOrganization(name: string, excludeId?: string) {
  const where: Prisma.OrganizationWhereInput = {
    name: { equals: name, mode: "insensitive" },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.organization.findFirst({
    where,
    select: { id: true, name: true },
  });

  return existing
    ? { isDuplicate: true, existingId: existing.id, existingName: existing.name }
    : { isDuplicate: false };
}

export class OrganizationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "OrganizationServiceError";
  }
}
