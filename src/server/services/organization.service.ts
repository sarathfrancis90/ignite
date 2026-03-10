import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  OrganizationListInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
} from "./organization.schemas";

type JsonSafe = Record<string, string> | null;

const managerInclude = {
  include: { user: { select: { id: true, name: true, email: true } } },
} as const;

const orgWithManagersInclude = {
  _count: { select: { contacts: true } },
  managers: managerInclude,
} as const;

type OrgWithManagers = Prisma.OrganizationGetPayload<{
  include: typeof orgWithManagersInclude;
}>;

function mapOrganizationToResponse(org: OrgWithManagers) {
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
      assignedAt: m.assignedAt.toISOString(),
    })),
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

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
      ...orgWithManagersInclude,
      managers: { ...managerInclude, take: 3 },
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
    items: items.map(mapOrganizationToResponse),
    nextCursor,
  };
}

export async function getOrganizationById(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      ...orgWithManagersInclude,
      contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] },
    },
  });

  if (!org) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  return {
    ...mapOrganizationToResponse(org),
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
    include: orgWithManagersInclude,
  });

  childLogger.info({ organizationId: org.id, actorId }, "Organization created");

  eventBus.emit("organization.created", {
    entity: "organization",
    entityId: org.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: org.name, relationshipStatus: org.relationshipStatus },
  });

  return mapOrganizationToResponse(org);
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

  const scalarFields = [
    "name",
    "description",
    "websiteUrl",
    "logoUrl",
    "industry",
    "location",
    "foundedYear",
    "employeeCount",
    "fundingStage",
    "fundingTotal",
    "relationshipStatus",
    "ndaStatus",
    "isConfidential",
    "crunchbaseId",
    "innospotId",
  ] as const;
  const data: Prisma.OrganizationUpdateInput = {};
  for (const key of scalarFields) {
    if (input[key] !== undefined) {
      (data as Record<string, unknown>)[key] = input[key];
    }
  }
  if (input.customFields !== undefined)
    data.customFields = input.customFields === null ? Prisma.DbNull : input.customFields;
  if (input.managementTeam !== undefined)
    data.managementTeam = input.managementTeam === null ? Prisma.DbNull : input.managementTeam;

  const org = await prisma.organization.update({
    where: { id: input.id },
    data,
    include: orgWithManagersInclude,
  });

  childLogger.info({ organizationId: org.id, actorId }, "Organization updated");

  eventBus.emit("organization.updated", {
    entity: "organization",
    entityId: org.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return mapOrganizationToResponse(org);
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

  eventBus.emit("organization.deleted", {
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
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };
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
