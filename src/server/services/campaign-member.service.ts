import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { ResourceRoleType } from "@prisma/client";

const childLogger = logger.child({ service: "campaign-member" });

// ── Input Schemas ──────────────────────────────────────────

export const campaignMemberSetInput = z.object({
  campaignId: z.string().cuid(),
  members: z.array(
    z.object({
      userId: z.string().cuid(),
      role: z.enum([
        "CAMPAIGN_MANAGER",
        "CAMPAIGN_COACH",
        "CAMPAIGN_CONTRIBUTOR",
        "CAMPAIGN_MODERATOR",
        "CAMPAIGN_EVALUATOR",
        "CAMPAIGN_SEEDER",
        "CAMPAIGN_SPONSOR",
      ]),
      category: z.string().max(200).optional(),
    }),
  ),
});

export type CampaignMemberSetInput = z.infer<typeof campaignMemberSetInput>;

export const campaignMemberListInput = z.object({
  campaignId: z.string().cuid(),
  role: z
    .enum([
      "CAMPAIGN_MANAGER",
      "CAMPAIGN_COACH",
      "CAMPAIGN_CONTRIBUTOR",
      "CAMPAIGN_MODERATOR",
      "CAMPAIGN_EVALUATOR",
      "CAMPAIGN_SEEDER",
    ])
    .optional(),
});

export type CampaignMemberListInput = z.infer<typeof campaignMemberListInput>;

export const userSearchInput = z.object({
  search: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(10),
  excludeIds: z.array(z.string().cuid()).optional(),
});

export type UserSearchInput = z.infer<typeof userSearchInput>;

/**
 * Search active users by name or email for assignment pickers.
 */
export async function searchUsers(input: UserSearchInput) {
  const where = {
    isActive: true,
    OR: [
      { name: { contains: input.search, mode: "insensitive" as const } },
      { email: { contains: input.search, mode: "insensitive" as const } },
    ],
    ...(input.excludeIds?.length ? { id: { notIn: input.excludeIds } } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    take: input.limit,
    orderBy: { name: "asc" },
  });

  return users;
}

/**
 * Set campaign members for a specific role (replaces existing).
 * This is an idempotent bulk operation — pass all members for a role.
 */
export async function setCampaignMembers(input: CampaignMemberSetInput, actorId: string) {
  const { campaignId, members } = input;

  // Get distinct roles being set
  const rolesToSet = [...new Set(members.map((m) => m.role))];

  await prisma.$transaction(async (tx) => {
    // Delete existing members for the roles being set
    for (const role of rolesToSet) {
      await tx.campaignMember.deleteMany({
        where: { campaignId, role: role as ResourceRoleType },
      });
    }

    // Create new members
    if (members.length > 0) {
      await tx.campaignMember.createMany({
        data: members.map((m) => ({
          campaignId,
          userId: m.userId,
          role: m.role as ResourceRoleType,
          category: m.category ?? null,
          assignedBy: actorId,
        })),
        skipDuplicates: true,
      });
    }
  });

  eventBus.emit("campaign.updated", {
    entity: "campaign",
    entityId: campaignId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: ["members"], roles: rolesToSet },
  });

  childLogger.info(
    { campaignId, memberCount: members.length, roles: rolesToSet },
    "Campaign members updated",
  );

  return { success: true };
}

/**
 * List campaign members, optionally filtered by role.
 */
export async function listCampaignMembers(input: CampaignMemberListInput) {
  const where = {
    campaignId: input.campaignId,
    ...(input.role ? { role: input.role as ResourceRoleType } : {}),
  };

  const members = await prisma.campaignMember.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    category: m.category,
    user: m.user,
    assignedAt: m.assignedAt.toISOString(),
  }));
}
