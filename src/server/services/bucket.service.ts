import { prisma } from "@/server/lib/prisma";
import type { SmartFilter } from "@/types/bucket";
import type { Prisma, IdeaStatus } from "@/generated/prisma/client";

// ============================================================
// Bucket Service — Business logic for manual & smart buckets
// ============================================================

export async function listBuckets(campaignId: string) {
  const buckets = await prisma.bucket.findMany({
    where: { campaignId },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return buckets.map((b) => ({
    ...b,
    ideaCount: b._count.items,
    _count: undefined,
  }));
}

export async function createBucket(input: {
  campaignId: string;
  name: string;
  color: string;
}) {
  return prisma.bucket.create({
    data: {
      name: input.name,
      color: input.color,
      isSmart: false,
      campaignId: input.campaignId,
    },
  });
}

export async function createSmartBucket(input: {
  campaignId: string;
  name: string;
  color: string;
  filter: SmartFilter;
}) {
  return prisma.bucket.create({
    data: {
      name: input.name,
      color: input.color,
      isSmart: true,
      smartFilter: input.filter as Prisma.InputJsonValue,
      campaignId: input.campaignId,
    },
  });
}

export async function updateBucket(input: {
  bucketId: string;
  name?: string;
  color?: string;
  filter?: SmartFilter;
}) {
  const data: Prisma.BucketUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.color !== undefined) data.color = input.color;
  if (input.filter !== undefined)
    data.smartFilter = input.filter as Prisma.InputJsonValue;

  return prisma.bucket.update({
    where: { id: input.bucketId },
    data,
  });
}

export async function deleteBucket(bucketId: string) {
  // Cascade deletes IdeaBucket entries via schema onDelete: Cascade
  return prisma.bucket.delete({
    where: { id: bucketId },
  });
}

export async function getBucketItems(bucketId: string) {
  const bucket = await prisma.bucket.findUniqueOrThrow({
    where: { id: bucketId },
    include: { items: { include: { idea: true } } },
  });

  // For smart buckets, re-evaluate filter criteria on access
  if (bucket.isSmart && bucket.smartFilter) {
    return evaluateSmartBucket(
      bucket.campaignId!,
      bucket.smartFilter as SmartFilter,
    );
  }

  return bucket.items.map((item) => item.idea);
}

export async function assignIdeaToBucket(ideaId: string, bucketId: string) {
  return prisma.ideaBucket.create({
    data: { ideaId, bucketId },
  });
}

export async function removeIdeaFromBucket(ideaId: string, bucketId: string) {
  return prisma.ideaBucket.delete({
    where: {
      ideaId_bucketId: { ideaId, bucketId },
    },
  });
}

export async function bulkAssignBucket(ideaIds: string[], bucketId: string) {
  const data = ideaIds.map((ideaId) => ({
    ideaId,
    bucketId,
  }));

  return prisma.ideaBucket.createMany({
    data,
    skipDuplicates: true,
  });
}

// ============================================================
// Smart Bucket Evaluation
// ============================================================

/**
 * Build a Prisma where clause from a SmartFilter and return matching ideas.
 * Smart buckets re-evaluate their filter criteria on every access,
 * so they always reflect the latest state of ideas.
 */
export async function evaluateSmartBucket(
  campaignId: string,
  filter: SmartFilter,
) {
  const where: Prisma.IdeaWhereInput = {
    campaignId,
  };

  if (filter.status && filter.status.length > 0) {
    where.status = { in: filter.status as IdeaStatus[] };
  }

  if (filter.categoryId) {
    where.categoryId = filter.categoryId;
  }

  if (filter.minVoteScore !== undefined) {
    where.avgVoteScore = {
      ...((where.avgVoteScore as Prisma.FloatNullableFilter) || {}),
      gte: filter.minVoteScore,
    };
  }

  if (filter.maxVoteScore !== undefined) {
    where.avgVoteScore = {
      ...((where.avgVoteScore as Prisma.FloatNullableFilter) || {}),
      lte: filter.maxVoteScore,
    };
  }

  if (filter.minLikeCount !== undefined) {
    where.likeCount = { gte: filter.minLikeCount };
  }

  if (filter.minCommentCount !== undefined) {
    where.commentCount = { gte: filter.minCommentCount };
  }

  if (filter.isHot !== undefined) {
    where.isHot = filter.isHot;
  }

  if (filter.tags && filter.tags.length > 0) {
    where.tags = {
      some: {
        name: { in: filter.tags },
      },
    };
  }

  if (filter.dateRange) {
    if (filter.dateRange.from) {
      where.submittedAt = {
        ...((where.submittedAt as Prisma.DateTimeNullableFilter) || {}),
        gte: new Date(filter.dateRange.from),
      };
    }
    if (filter.dateRange.to) {
      where.submittedAt = {
        ...((where.submittedAt as Prisma.DateTimeNullableFilter) || {}),
        lte: new Date(filter.dateRange.to),
      };
    }
  }

  return prisma.idea.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get bucket with its idea count. For smart buckets, count is evaluated dynamically.
 */
export async function getBucketWithCount(bucketId: string) {
  const bucket = await prisma.bucket.findUniqueOrThrow({
    where: { id: bucketId },
    include: { _count: { select: { items: true } } },
  });

  if (bucket.isSmart && bucket.smartFilter && bucket.campaignId) {
    const ideas = await evaluateSmartBucket(
      bucket.campaignId,
      bucket.smartFilter as SmartFilter,
    );
    return {
      ...bucket,
      ideaCount: ideas.length,
      _count: undefined,
    };
  }

  return {
    ...bucket,
    ideaCount: bucket._count.items,
    _count: undefined,
  };
}
