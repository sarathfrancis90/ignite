import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";

const childLogger = logger.child({ service: "org-unit" });

// ── Input Schemas ──────────────────────────────────────────

export const orgUnitCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  parentId: z.string().cuid().optional().nullable(),
});

export const orgUnitUpdateInput = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable(),
  parentId: z.string().cuid().optional().nullable(),
});

export const orgUnitDeleteInput = z.object({
  id: z.string().cuid(),
});

export const orgUnitAssignUserInput = z.object({
  orgUnitId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const orgUnitRemoveUserInput = z.object({
  orgUnitId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const orgUnitGetByIdInput = z.object({
  id: z.string().cuid(),
});

export type OrgUnitCreateInput = z.infer<typeof orgUnitCreateInput>;
export type OrgUnitUpdateInput = z.infer<typeof orgUnitUpdateInput>;

// ── Tree Types ─────────────────────────────────────────────

interface OrgUnitFlat {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { userAssignments: number; children: number };
}

export interface OrgUnitTreeNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  userCount: number;
  childCount: number;
  children: OrgUnitTreeNode[];
}

// ── Service Functions ──────────────────────────────────────

/**
 * Get full org unit tree (all units with hierarchy).
 */
export async function getOrgUnitTree(): Promise<OrgUnitTreeNode[]> {
  const units = await prisma.orgUnit.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { userAssignments: true, children: true },
      },
    },
  });

  return buildTree(units);
}

/**
 * Get a single org unit by ID with its assigned users.
 */
export async function getOrgUnitById(id: string) {
  const unit = await prisma.orgUnit.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      children: {
        select: { id: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      },
      userAssignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      _count: {
        select: { userAssignments: true, children: true },
      },
    },
  });

  if (!unit) {
    throw new OrgUnitServiceError("Org unit not found", "ORG_UNIT_NOT_FOUND");
  }

  return {
    ...unit,
    userCount: unit._count.userAssignments,
    childCount: unit._count.children,
    users: unit.userAssignments.map((a) => ({
      ...a.user,
      assignedAt: a.assignedAt,
    })),
  };
}

/**
 * Create a new org unit.
 */
export async function createOrgUnit(input: OrgUnitCreateInput, actorId: string) {
  if (input.parentId) {
    const parent = await prisma.orgUnit.findUnique({
      where: { id: input.parentId },
    });
    if (!parent) {
      throw new OrgUnitServiceError("Parent org unit not found", "PARENT_NOT_FOUND");
    }
  }

  const unit = await prisma.orgUnit.create({
    data: {
      name: input.name,
      description: input.description,
      parentId: input.parentId ?? null,
    },
    include: {
      _count: {
        select: { userAssignments: true, children: true },
      },
    },
  });

  childLogger.info({ orgUnitId: unit.id, actorId }, "Org unit created");

  eventBus.emit("orgUnit.created", {
    entity: "orgUnit",
    entityId: unit.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: unit.name, parentId: unit.parentId },
  });

  return unit;
}

/**
 * Update an org unit (name, description, or parent).
 */
export async function updateOrgUnit(input: OrgUnitUpdateInput, actorId: string) {
  const existing = await prisma.orgUnit.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new OrgUnitServiceError("Org unit not found", "ORG_UNIT_NOT_FOUND");
  }

  // If moving to a new parent, validate no circular reference
  if (input.parentId !== undefined) {
    if (input.parentId === input.id) {
      throw new OrgUnitServiceError("Cannot set org unit as its own parent", "CIRCULAR_REFERENCE");
    }

    if (input.parentId !== null) {
      const parent = await prisma.orgUnit.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new OrgUnitServiceError("Parent org unit not found", "PARENT_NOT_FOUND");
      }

      // Check that the new parent is not a descendant of this unit
      const isDescendant = await isDescendantOf(input.parentId, input.id);
      if (isDescendant) {
        throw new OrgUnitServiceError(
          "Cannot move org unit under its own descendant",
          "CIRCULAR_REFERENCE",
        );
      }
    }
  }

  const data: { name?: string; description?: string | null; parentId?: string | null } = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.parentId !== undefined) data.parentId = input.parentId;

  const unit = await prisma.orgUnit.update({
    where: { id: input.id },
    data,
    include: {
      _count: {
        select: { userAssignments: true, children: true },
      },
    },
  });

  childLogger.info({ orgUnitId: unit.id, actorId }, "Org unit updated");

  eventBus.emit("orgUnit.updated", {
    entity: "orgUnit",
    entityId: unit.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return unit;
}

/**
 * Delete an org unit (only if no children and no assigned users).
 */
export async function deleteOrgUnit(id: string, actorId: string) {
  const unit = await prisma.orgUnit.findUnique({
    where: { id },
    include: {
      _count: {
        select: { children: true, userAssignments: true },
      },
    },
  });

  if (!unit) {
    throw new OrgUnitServiceError("Org unit not found", "ORG_UNIT_NOT_FOUND");
  }

  if (unit._count.children > 0) {
    throw new OrgUnitServiceError(
      "Cannot delete org unit with child units. Remove or move children first.",
      "HAS_CHILDREN",
    );
  }

  if (unit._count.userAssignments > 0) {
    throw new OrgUnitServiceError(
      "Cannot delete org unit with assigned users. Remove user assignments first.",
      "HAS_USERS",
    );
  }

  await prisma.orgUnit.delete({ where: { id } });

  childLogger.info({ orgUnitId: id, actorId }, "Org unit deleted");

  eventBus.emit("orgUnit.deleted", {
    entity: "orgUnit",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: unit.name },
  });
}

/**
 * Assign a user to an org unit.
 */
export async function assignUserToOrgUnit(orgUnitId: string, userId: string, actorId: string) {
  const [orgUnit, user] = await Promise.all([
    prisma.orgUnit.findUnique({ where: { id: orgUnitId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  if (!orgUnit) {
    throw new OrgUnitServiceError("Org unit not found", "ORG_UNIT_NOT_FOUND");
  }
  if (!user) {
    throw new OrgUnitServiceError("User not found", "USER_NOT_FOUND");
  }

  const assignment = await prisma.userOrgUnit.upsert({
    where: {
      userId_orgUnitId: { userId, orgUnitId },
    },
    create: { userId, orgUnitId },
    update: {},
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info({ orgUnitId, userId, actorId }, "User assigned to org unit");

  eventBus.emit("orgUnit.userAssigned", {
    entity: "orgUnit",
    entityId: orgUnitId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId, orgUnitId },
  });

  return assignment;
}

/**
 * Remove a user from an org unit.
 */
export async function removeUserFromOrgUnit(orgUnitId: string, userId: string, actorId: string) {
  const assignment = await prisma.userOrgUnit.findUnique({
    where: {
      userId_orgUnitId: { userId, orgUnitId },
    },
  });

  if (!assignment) {
    throw new OrgUnitServiceError("User is not assigned to this org unit", "ASSIGNMENT_NOT_FOUND");
  }

  await prisma.userOrgUnit.delete({
    where: { id: assignment.id },
  });

  childLogger.info({ orgUnitId, userId, actorId }, "User removed from org unit");

  eventBus.emit("orgUnit.userRemoved", {
    entity: "orgUnit",
    entityId: orgUnitId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId, orgUnitId },
  });
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Check if `candidateId` is a descendant of `ancestorId`.
 */
async function isDescendantOf(candidateId: string, ancestorId: string): Promise<boolean> {
  const allUnits = await prisma.orgUnit.findMany({
    select: { id: true, parentId: true },
  });

  const parentMap = new Map<string, string | null>();
  for (const u of allUnits) {
    parentMap.set(u.id, u.parentId);
  }

  let current: string | null = candidateId;
  const visited = new Set<string>();

  while (current !== null) {
    if (current === ancestorId) return true;
    if (visited.has(current)) break;
    visited.add(current);
    current = parentMap.get(current) ?? null;
  }

  return false;
}

/**
 * Build a tree structure from a flat list of org units.
 */
function buildTree(units: OrgUnitFlat[]): OrgUnitTreeNode[] {
  const nodeMap = new Map<string, OrgUnitTreeNode>();

  for (const unit of units) {
    nodeMap.set(unit.id, {
      id: unit.id,
      name: unit.name,
      description: unit.description,
      parentId: unit.parentId,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      userCount: unit._count.userAssignments,
      childCount: unit._count.children,
      children: [],
    });
  }

  const roots: OrgUnitTreeNode[] = [];

  for (const unit of units) {
    const node = nodeMap.get(unit.id);
    if (!node) continue;

    if (unit.parentId && nodeMap.has(unit.parentId)) {
      const parent = nodeMap.get(unit.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Error Class ────────────────────────────────────────────

export class OrgUnitServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "OrgUnitServiceError";
  }
}
