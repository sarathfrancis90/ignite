import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  CommentCreateInput,
  CommentUpdateInput,
  CommentFlagInput,
  CommentListInput,
} from "./comment.schemas";

export {
  commentCreateInput,
  commentUpdateInput,
  commentDeleteInput,
  commentFlagInput,
  commentListInput,
  commentGetByIdInput,
} from "./comment.schemas";

export type {
  CommentCreateInput,
  CommentUpdateInput,
  CommentDeleteInput,
  CommentFlagInput,
  CommentListInput,
} from "./comment.schemas";

const childLogger = logger.child({ service: "comment" });

const MAX_NESTING_DEPTH = 2;

const commentAuthorSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

function serializeComment(comment: {
  id: string;
  content: string;
  ideaId: string;
  authorId: string;
  parentId: string | null;
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: { id: string; name: string | null; email: string; image: string | null };
  mentions?: Array<{
    id: string;
    mentionedUser: { id: string; name: string | null; email: string; image: string | null };
  }>;
  replies?: Array<{
    id: string;
    content: string;
    ideaId: string;
    authorId: string;
    parentId: string | null;
    flagged: boolean;
    createdAt: Date;
    updatedAt: Date;
    author?: { id: string; name: string | null; email: string; image: string | null };
    mentions?: Array<{
      id: string;
      mentionedUser: { id: string; name: string | null; email: string; image: string | null };
    }>;
    replies?: Array<{
      id: string;
      content: string;
      ideaId: string;
      authorId: string;
      parentId: string | null;
      flagged: boolean;
      createdAt: Date;
      updatedAt: Date;
      author?: { id: string; name: string | null; email: string; image: string | null };
      mentions?: Array<{
        id: string;
        mentionedUser: { id: string; name: string | null; email: string; image: string | null };
      }>;
    }>;
  }>;
}) {
  return {
    id: comment.id,
    content: comment.content,
    ideaId: comment.ideaId,
    authorId: comment.authorId,
    parentId: comment.parentId,
    flagged: comment.flagged,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: comment.author,
    mentions: comment.mentions?.map((m) => m.mentionedUser),
    replies: comment.replies?.map(serializeReply),
  };
}

function serializeReply(reply: {
  id: string;
  content: string;
  ideaId: string;
  authorId: string;
  parentId: string | null;
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: { id: string; name: string | null; email: string; image: string | null };
  mentions?: Array<{
    id: string;
    mentionedUser: { id: string; name: string | null; email: string; image: string | null };
  }>;
  replies?: Array<{
    id: string;
    content: string;
    ideaId: string;
    authorId: string;
    parentId: string | null;
    flagged: boolean;
    createdAt: Date;
    updatedAt: Date;
    author?: { id: string; name: string | null; email: string; image: string | null };
    mentions?: Array<{
      id: string;
      mentionedUser: { id: string; name: string | null; email: string; image: string | null };
    }>;
  }>;
}) {
  return {
    id: reply.id,
    content: reply.content,
    ideaId: reply.ideaId,
    authorId: reply.authorId,
    parentId: reply.parentId,
    flagged: reply.flagged,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    author: reply.author,
    mentions: reply.mentions?.map((m) => m.mentionedUser),
    replies: reply.replies?.map((r) => ({
      id: r.id,
      content: r.content,
      ideaId: r.ideaId,
      authorId: r.authorId,
      parentId: r.parentId,
      flagged: r.flagged,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      author: r.author,
      mentions: r.mentions?.map((m) => m.mentionedUser),
    })),
  };
}

const mentionInclude = {
  include: {
    mentionedUser: { select: commentAuthorSelect },
  },
} as const;

/**
 * List top-level comments for an idea with threaded replies (max 2 levels).
 * Uses cursor-based pagination.
 */
export async function listComments(input: CommentListInput) {
  const items = await prisma.comment.findMany({
    where: {
      ideaId: input.ideaId,
      parentId: null, // Top-level comments only
    },
    include: {
      author: { select: commentAuthorSelect },
      mentions: mentionInclude,
      replies: {
        include: {
          author: { select: commentAuthorSelect },
          mentions: mentionInclude,
          replies: {
            include: {
              author: { select: commentAuthorSelect },
              mentions: mentionInclude,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "asc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(serializeComment),
    nextCursor,
  };
}

/**
 * Get a single comment by ID.
 */
export async function getCommentById(id: string) {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: { select: commentAuthorSelect },
      mentions: mentionInclude,
    },
  });

  if (!comment) {
    throw new CommentServiceError("Comment not found", "COMMENT_NOT_FOUND");
  }

  return serializeComment(comment);
}

/**
 * Create a comment on an idea. Supports threaded replies (max 2 levels)
 * and @mentions. Auto-increments the idea's commentsCount.
 */
export async function createComment(input: CommentCreateInput, authorId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: { id: true, campaignId: true, status: true },
  });

  if (!idea) {
    throw new CommentServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  // Validate nesting depth (max 2 levels)
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { id: true, parentId: true, ideaId: true },
    });

    if (!parent) {
      throw new CommentServiceError("Parent comment not found", "PARENT_NOT_FOUND");
    }

    if (parent.ideaId !== input.ideaId) {
      throw new CommentServiceError(
        "Parent comment does not belong to the same idea",
        "PARENT_IDEA_MISMATCH",
      );
    }

    // If parent already has a parent, this would be level 3 — redirect to level 2
    if (parent.parentId) {
      // Check if grandparent exists (would make this level 3+)
      const grandparent = await prisma.comment.findUnique({
        where: { id: parent.parentId },
        select: { parentId: true },
      });

      if (grandparent?.parentId) {
        throw new CommentServiceError(
          `Comments can only be nested up to ${MAX_NESTING_DEPTH} levels`,
          "MAX_NESTING_EXCEEDED",
        );
      }
    }
  }

  const comment = await prisma.$transaction(async (tx) => {
    const newComment = await tx.comment.create({
      data: {
        content: input.content,
        ideaId: input.ideaId,
        authorId,
        parentId: input.parentId,
      },
      include: {
        author: { select: commentAuthorSelect },
        mentions: mentionInclude,
      },
    });

    // Create mentions
    if (input.mentionedUserIds && input.mentionedUserIds.length > 0) {
      const uniqueMentionIds = [...new Set(input.mentionedUserIds)].filter((id) => id !== authorId);

      if (uniqueMentionIds.length > 0) {
        await tx.commentMention.createMany({
          data: uniqueMentionIds.map((userId) => ({
            commentId: newComment.id,
            mentionedUserId: userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Increment idea's commentsCount
    await tx.idea.update({
      where: { id: input.ideaId },
      data: { commentsCount: { increment: 1 } },
    });

    // Re-fetch with mentions
    return tx.comment.findUnique({
      where: { id: newComment.id },
      include: {
        author: { select: commentAuthorSelect },
        mentions: mentionInclude,
      },
    });
  });

  if (!comment) {
    throw new CommentServiceError("Failed to create comment", "CREATE_FAILED");
  }

  eventBus.emit("comment.created", {
    entity: "comment",
    entityId: comment.id,
    actor: authorId,
    timestamp: new Date().toISOString(),
    metadata: {
      ideaId: input.ideaId,
      campaignId: idea.campaignId,
      parentId: input.parentId,
      isReply: !!input.parentId,
    },
  });

  // Emit mention events for each mentioned user
  if (input.mentionedUserIds && input.mentionedUserIds.length > 0) {
    const uniqueMentionIds = [...new Set(input.mentionedUserIds)].filter((id) => id !== authorId);
    for (const mentionedUserId of uniqueMentionIds) {
      eventBus.emit("comment.mentioned", {
        entity: "comment",
        entityId: comment.id,
        actor: authorId,
        timestamp: new Date().toISOString(),
        metadata: {
          ideaId: input.ideaId,
          campaignId: idea.campaignId,
          mentionedUserId,
        },
      });
    }
  }

  childLogger.info(
    { commentId: comment.id, ideaId: input.ideaId, isReply: !!input.parentId },
    "Comment created",
  );

  return serializeComment(comment);
}

/**
 * Update a comment. Only the author can update their own comment.
 */
export async function updateComment(input: CommentUpdateInput, updatedById: string) {
  const existing = await prisma.comment.findUnique({
    where: { id: input.id },
    select: { id: true, authorId: true, ideaId: true },
  });

  if (!existing) {
    throw new CommentServiceError("Comment not found", "COMMENT_NOT_FOUND");
  }

  if (existing.authorId !== updatedById) {
    throw new CommentServiceError("You can only edit your own comments", "NOT_AUTHORIZED");
  }

  const comment = await prisma.$transaction(async (tx) => {
    const updated = await tx.comment.update({
      where: { id: input.id },
      data: { content: input.content },
      include: {
        author: { select: commentAuthorSelect },
        mentions: mentionInclude,
      },
    });

    // Update mentions if provided
    if (input.mentionedUserIds !== undefined) {
      await tx.commentMention.deleteMany({ where: { commentId: input.id } });

      const uniqueMentionIds = [...new Set(input.mentionedUserIds)].filter(
        (id) => id !== updatedById,
      );

      if (uniqueMentionIds.length > 0) {
        await tx.commentMention.createMany({
          data: uniqueMentionIds.map((userId) => ({
            commentId: input.id,
            mentionedUserId: userId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.comment.findUnique({
        where: { id: input.id },
        include: {
          author: { select: commentAuthorSelect },
          mentions: mentionInclude,
        },
      });
    }

    return updated;
  });

  if (!comment) {
    throw new CommentServiceError("Comment not found after update", "COMMENT_NOT_FOUND");
  }

  eventBus.emit("comment.updated", {
    entity: "comment",
    entityId: comment.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: existing.ideaId },
  });

  childLogger.info({ commentId: comment.id }, "Comment updated");

  return serializeComment(comment);
}

/**
 * Delete a comment. The author can delete their own, moderators can delete any.
 */
export async function deleteComment(commentId: string, actor: string, isModeratorOrAbove: boolean) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      ideaId: true,
      _count: { select: { replies: true } },
    },
  });

  if (!comment) {
    throw new CommentServiceError("Comment not found", "COMMENT_NOT_FOUND");
  }

  if (comment.authorId !== actor && !isModeratorOrAbove) {
    throw new CommentServiceError("You can only delete your own comments", "NOT_AUTHORIZED");
  }

  // Count total comments being deleted (comment + replies cascade)
  const replyCount = comment._count.replies;
  const totalDeleted = 1 + replyCount;

  await prisma.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id: commentId } });

    // Decrement idea's commentsCount
    await tx.idea.update({
      where: { id: comment.ideaId },
      data: { commentsCount: { decrement: totalDeleted } },
    });
  });

  eventBus.emit("comment.deleted", {
    entity: "comment",
    entityId: commentId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: comment.ideaId, repliesDeleted: replyCount },
  });

  childLogger.info({ commentId, ideaId: comment.ideaId }, "Comment deleted");

  return { id: commentId };
}

/**
 * Flag or unflag a comment as inappropriate. Only moderators can do this.
 */
export async function flagComment(input: CommentFlagInput, actor: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: input.id },
    select: { id: true, ideaId: true, flagged: true },
  });

  if (!comment) {
    throw new CommentServiceError("Comment not found", "COMMENT_NOT_FOUND");
  }

  const updated = await prisma.comment.update({
    where: { id: input.id },
    data: { flagged: input.flagged },
    include: {
      author: { select: commentAuthorSelect },
      mentions: mentionInclude,
    },
  });

  const eventName = input.flagged ? "comment.flagged" : "comment.unflagged";
  eventBus.emit(eventName, {
    entity: "comment",
    entityId: input.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: comment.ideaId, flagged: input.flagged },
  });

  childLogger.info({ commentId: input.id, flagged: input.flagged }, "Comment flag toggled");

  return serializeComment(updated);
}

export class CommentServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CommentServiceError";
  }
}
