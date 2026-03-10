import {
  type PrismaClient,
  type Idea,
  IdeaStatus,
  IdeaCreationType,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { eventBus } from "../events/event-bus";
import {
  type SplitIdeaInput,
  type MergeIdeasInput,
  type BulkAssignBucketInput,
  type BulkArchiveInput,
  type BulkExportInput,
} from "../../types/idea";

/** Statuses that allow split/merge operations */
const BOARD_OPERATION_STATUSES: IdeaStatus[] = [
  IdeaStatus.COMMUNITY_DISCUSSION,
  IdeaStatus.HOT,
  IdeaStatus.EVALUATION,
  IdeaStatus.QUALIFICATION,
];

/** Statuses that allow archiving */
const ARCHIVABLE_STATUSES: IdeaStatus[] = [
  IdeaStatus.DRAFT,
  IdeaStatus.QUALIFICATION,
  IdeaStatus.COMMUNITY_DISCUSSION,
  IdeaStatus.HOT,
  IdeaStatus.EVALUATION,
  IdeaStatus.SELECTED_CONCEPT,
  IdeaStatus.SELECTED_IMPLEMENTATION,
];

export class IdeaService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Split an idea into multiple new ideas.
   * The original can optionally be archived.
   * Contributors and tags are preserved on all split ideas.
   */
  async splitIdea(input: SplitIdeaInput, userId: string): Promise<Idea[]> {
    const original = await this.prisma.idea.findUnique({
      where: { id: input.ideaId },
      include: {
        coAuthors: true,
        tags: true,
        bucketAssignments: true,
      },
    });

    if (!original) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Idea ${input.ideaId} not found`,
      });
    }

    if (!BOARD_OPERATION_STATUSES.includes(original.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot split idea in ${original.status} status`,
      });
    }

    if (!original.campaignId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Can only split ideas that belong to a campaign",
      });
    }

    const newIdeas = await this.prisma.$transaction(async (tx) => {
      const created: Idea[] = [];

      for (const split of input.splits) {
        const newIdea = await tx.idea.create({
          data: {
            title: split.title,
            description: split.description ?? null,
            status: original.status,
            creationType: IdeaCreationType.SPLIT,
            splitFromId: original.id,
            contributorId: original.contributorId,
            campaignId: original.campaignId,
            isConfidential: original.isConfidential,
          },
        });

        // Copy co-authors to split ideas
        if (original.coAuthors.length > 0) {
          await tx.ideaCoAuthor.createMany({
            data: original.coAuthors.map((ca) => ({
              ideaId: newIdea.id,
              userId: ca.userId,
            })),
          });
        }

        // Copy tags to split ideas
        if (original.tags.length > 0) {
          await tx.ideaTag.createMany({
            data: original.tags.map((t) => ({
              ideaId: newIdea.id,
              tagId: t.tagId,
            })),
          });
        }

        // Copy bucket assignments to split ideas
        if (original.bucketAssignments.length > 0) {
          await tx.ideaBucket.createMany({
            data: original.bucketAssignments.map((ba) => ({
              ideaId: newIdea.id,
              bucketId: ba.bucketId,
            })),
          });
        }

        // Log activity for each new split idea
        await tx.activityLog.create({
          data: {
            action: "idea.split.created",
            entityType: "Idea",
            entityId: newIdea.id,
            userId,
            ideaId: newIdea.id,
            metadata: { splitFromId: original.id },
          },
        });

        created.push(newIdea);
      }

      // Archive the original if requested
      if (input.archiveOriginal) {
        await tx.idea.update({
          where: { id: original.id },
          data: { status: IdeaStatus.ARCHIVED },
        });

        await tx.activityLog.create({
          data: {
            action: "idea.archived.split",
            entityType: "Idea",
            entityId: original.id,
            userId,
            ideaId: original.id,
            metadata: {
              reason: "Split into new ideas",
              splitIntoIds: created.map((i) => i.id),
            },
          },
        });
      }

      return created;
    });

    eventBus.emitIdeaSplit({
      ideaId: input.ideaId,
      actorId: userId,
      timestamp: new Date().toISOString(),
      originalIdeaId: input.ideaId,
      newIdeaIds: newIdeas.map((i) => i.id),
    });

    return newIdeas;
  }

  /**
   * Merge multiple ideas into a single new idea.
   * All comments, votes, likes, and contributors are attributed to the merged idea.
   * Original ideas are archived.
   */
  async mergeIdeas(input: MergeIdeasInput, userId: string): Promise<Idea> {
    const sourceIdeas = await this.prisma.idea.findMany({
      where: {
        id: { in: input.ideaIds },
        campaignId: input.campaignId,
      },
      include: {
        coAuthors: true,
        comments: true,
        votes: true,
        likes: true,
        tags: true,
        bucketAssignments: true,
      },
    });

    if (sourceIdeas.length !== input.ideaIds.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "One or more ideas not found in the specified campaign",
      });
    }

    const invalidIdeas = sourceIdeas.filter(
      (i) => !BOARD_OPERATION_STATUSES.includes(i.status),
    );
    if (invalidIdeas.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot merge ideas in status: ${invalidIdeas.map((i) => `${i.title} (${i.status})`).join(", ")}`,
      });
    }

    // Build merged title/description from sources if not provided
    const mergedTitle =
      input.title ?? sourceIdeas.map((i) => i.title).join(" + ");
    const mergedDescription =
      input.description ??
      sourceIdeas
        .map((i) => `<h3>${i.title}</h3>\n${i.description ?? ""}`)
        .join("\n<hr/>\n");

    const mergedIdea = await this.prisma.$transaction(async (tx) => {
      // Determine the highest status among source ideas
      const statusPriority: IdeaStatus[] = [
        IdeaStatus.QUALIFICATION,
        IdeaStatus.COMMUNITY_DISCUSSION,
        IdeaStatus.HOT,
        IdeaStatus.EVALUATION,
      ];
      const bestStatus = sourceIdeas.reduce((best, idea) => {
        const currentIndex = statusPriority.indexOf(idea.status);
        const bestIndex = statusPriority.indexOf(best);
        return currentIndex > bestIndex ? idea.status : best;
      }, sourceIdeas[0]!.status);

      // Create the merged idea
      const newIdea = await tx.idea.create({
        data: {
          title: mergedTitle,
          description: mergedDescription,
          status: bestStatus,
          creationType: IdeaCreationType.MERGED,
          mergedFromIds: input.ideaIds,
          contributorId: sourceIdeas[0]!.contributorId,
          campaignId: input.campaignId,
          isConfidential: sourceIdeas.some((i) => i.isConfidential),
        },
      });

      // Collect unique co-authors (all contributors become co-authors)
      const allContributorIds = new Set<string>();
      for (const idea of sourceIdeas) {
        allContributorIds.add(idea.contributorId);
        for (const ca of idea.coAuthors) {
          allContributorIds.add(ca.userId);
        }
      }
      // Remove the primary contributor from co-author list
      allContributorIds.delete(newIdea.contributorId);

      if (allContributorIds.size > 0) {
        await tx.ideaCoAuthor.createMany({
          data: Array.from(allContributorIds).map((uid) => ({
            ideaId: newIdea.id,
            userId: uid,
          })),
        });
      }

      // Move comments to the merged idea
      const allCommentIds = sourceIdeas.flatMap((i) =>
        i.comments.map((c) => c.id),
      );
      if (allCommentIds.length > 0) {
        await tx.comment.updateMany({
          where: { id: { in: allCommentIds } },
          data: { ideaId: newIdea.id },
        });
      }

      // Re-create votes on merged idea (keep best vote per user/criterion)
      const voteMap = new Map<
        string,
        { userId: string; criterionId: string | null; score: number }
      >();
      for (const idea of sourceIdeas) {
        for (const vote of idea.votes) {
          const key = `${vote.userId}:${vote.criterionId ?? "default"}`;
          const existing = voteMap.get(key);
          if (!existing || vote.score > existing.score) {
            voteMap.set(key, {
              userId: vote.userId,
              criterionId: vote.criterionId,
              score: vote.score,
            });
          }
        }
      }
      if (voteMap.size > 0) {
        await tx.vote.createMany({
          data: Array.from(voteMap.values()).map((v) => ({
            ideaId: newIdea.id,
            userId: v.userId,
            criterionId: v.criterionId,
            score: v.score,
          })),
        });
      }

      // Re-create likes on merged idea (unique per user)
      const uniqueLikerIds = new Set<string>();
      for (const idea of sourceIdeas) {
        for (const like of idea.likes) {
          uniqueLikerIds.add(like.userId);
        }
      }
      if (uniqueLikerIds.size > 0) {
        await tx.like.createMany({
          data: Array.from(uniqueLikerIds).map((uid) => ({
            ideaId: newIdea.id,
            userId: uid,
          })),
        });
      }

      // Merge tags (unique)
      const uniqueTagIds = new Set<string>();
      for (const idea of sourceIdeas) {
        for (const tag of idea.tags) {
          uniqueTagIds.add(tag.tagId);
        }
      }
      if (uniqueTagIds.size > 0) {
        await tx.ideaTag.createMany({
          data: Array.from(uniqueTagIds).map((tagId) => ({
            ideaId: newIdea.id,
            tagId,
          })),
        });
      }

      // Merge bucket assignments (unique)
      const uniqueBucketIds = new Set<string>();
      for (const idea of sourceIdeas) {
        for (const ba of idea.bucketAssignments) {
          uniqueBucketIds.add(ba.bucketId);
        }
      }
      if (uniqueBucketIds.size > 0) {
        await tx.ideaBucket.createMany({
          data: Array.from(uniqueBucketIds).map((bucketId) => ({
            ideaId: newIdea.id,
            bucketId,
          })),
        });
      }

      // Update denormalized counts on the merged idea
      await tx.idea.update({
        where: { id: newIdea.id },
        data: {
          commentCount: allCommentIds.length,
          voteCount: voteMap.size,
          likeCount: uniqueLikerIds.size,
          viewCount: sourceIdeas.reduce((sum, i) => sum + i.viewCount, 0),
        },
      });

      // Archive all source ideas
      for (const sourceIdea of sourceIdeas) {
        await tx.idea.update({
          where: { id: sourceIdea.id },
          data: { status: IdeaStatus.ARCHIVED },
        });

        await tx.activityLog.create({
          data: {
            action: "idea.archived.merged",
            entityType: "Idea",
            entityId: sourceIdea.id,
            userId,
            ideaId: sourceIdea.id,
            metadata: {
              reason: "Merged into new idea",
              mergedIntoId: newIdea.id,
            },
          },
        });
      }

      // Log activity for the new merged idea
      await tx.activityLog.create({
        data: {
          action: "idea.merged.created",
          entityType: "Idea",
          entityId: newIdea.id,
          userId,
          ideaId: newIdea.id,
          metadata: {
            mergedFromIds: input.ideaIds,
          },
        },
      });

      return newIdea;
    });

    eventBus.emitIdeaMerged({
      ideaId: mergedIdea.id,
      actorId: userId,
      timestamp: new Date().toISOString(),
      sourceIdeaIds: input.ideaIds,
      newIdeaId: mergedIdea.id,
    });

    return mergedIdea;
  }

  /**
   * Bulk assign ideas to a bucket.
   */
  async bulkAssignBucket(
    input: BulkAssignBucketInput,
    userId: string,
  ): Promise<{ assignedCount: number }> {
    const bucket = await this.prisma.bucket.findUnique({
      where: { id: input.bucketId },
    });
    if (!bucket) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Bucket ${input.bucketId} not found`,
      });
    }

    const ideas = await this.prisma.idea.findMany({
      where: { id: { in: input.ideaIds } },
      select: { id: true },
    });
    if (ideas.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No matching ideas found",
      });
    }

    // Use skipDuplicates to avoid errors on existing assignments
    const result = await this.prisma.ideaBucket.createMany({
      data: ideas.map((idea) => ({
        ideaId: idea.id,
        bucketId: input.bucketId,
      })),
      skipDuplicates: true,
    });

    eventBus.emitIdeaBulkAction({
      ideaIds: ideas.map((i) => i.id),
      actorId: userId,
      action: "bulkAssignBucket",
      timestamp: new Date().toISOString(),
      metadata: { bucketId: input.bucketId },
    });

    return { assignedCount: result.count };
  }

  /**
   * Bulk archive ideas.
   */
  async bulkArchive(
    input: BulkArchiveInput,
    userId: string,
  ): Promise<{ archivedCount: number }> {
    const ideas = await this.prisma.idea.findMany({
      where: {
        id: { in: input.ideaIds },
        status: { in: ARCHIVABLE_STATUSES },
      },
      select: { id: true, status: true },
    });

    if (ideas.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No ideas eligible for archival",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.idea.updateMany({
        where: { id: { in: ideas.map((i) => i.id) } },
        data: { status: IdeaStatus.ARCHIVED },
      });

      await tx.activityLog.createMany({
        data: ideas.map((idea) => ({
          action: "idea.archived.bulk",
          entityType: "Idea",
          entityId: idea.id,
          userId,
          ideaId: idea.id,
          metadata: input.reason
            ? JSON.parse(JSON.stringify({ reason: input.reason }))
            : undefined,
        })),
      });
    });

    eventBus.emitIdeaBulkAction({
      ideaIds: ideas.map((i) => i.id),
      actorId: userId,
      action: "bulkArchive",
      timestamp: new Date().toISOString(),
      metadata: { reason: input.reason },
    });

    return { archivedCount: ideas.length };
  }

  /**
   * Export selected ideas as JSON or CSV.
   */
  async bulkExport(
    input: BulkExportInput,
  ): Promise<{ data: string; format: string }> {
    const ideas = await this.prisma.idea.findMany({
      where: { id: { in: input.ideaIds } },
      include: {
        contributor: {
          select: { firstName: true, lastName: true, email: true },
        },
        coAuthors: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        tags: {
          include: { tag: { select: { name: true } } },
        },
        bucketAssignments: {
          include: { bucket: { select: { name: true } } },
        },
      },
    });

    if (ideas.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No matching ideas found",
      });
    }

    if (input.format === "csv") {
      const headers = [
        "ID",
        "Title",
        "Status",
        "Contributor",
        "Co-Authors",
        "Tags",
        "Buckets",
        "Votes",
        "Likes",
        "Comments",
        "Created",
      ];
      const rows = ideas.map((idea) => [
        idea.id,
        `"${idea.title.replace(/"/g, '""')}"`,
        idea.status,
        `${idea.contributor.firstName} ${idea.contributor.lastName}`,
        idea.coAuthors
          .map((ca) => `${ca.user.firstName} ${ca.user.lastName}`)
          .join("; "),
        idea.tags.map((t) => t.tag.name).join("; "),
        idea.bucketAssignments.map((ba) => ba.bucket.name).join("; "),
        String(idea.voteCount),
        String(idea.likeCount),
        String(idea.commentCount),
        idea.createdAt.toISOString(),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      return { data: csv, format: "csv" };
    }

    // JSON format
    const exportData = ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      status: idea.status,
      creationType: idea.creationType,
      contributor: `${idea.contributor.firstName} ${idea.contributor.lastName}`,
      coAuthors: idea.coAuthors.map(
        (ca) => `${ca.user.firstName} ${ca.user.lastName}`,
      ),
      tags: idea.tags.map((t) => t.tag.name),
      buckets: idea.bucketAssignments.map((ba) => ba.bucket.name),
      metrics: {
        votes: idea.voteCount,
        likes: idea.likeCount,
        comments: idea.commentCount,
        views: idea.viewCount,
        avgVoteScore: idea.avgVoteScore,
        isHot: idea.isHot,
      },
      createdAt: idea.createdAt.toISOString(),
    }));

    return { data: JSON.stringify(exportData, null, 2), format: "json" };
  }
}
