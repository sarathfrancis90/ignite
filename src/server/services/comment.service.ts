import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const COMMENT_INCLUDE = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  replies: {
    where: { deletedAt: null },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      replies: {
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.CommentInclude;

export function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match = mentionRegex.exec(content);
  while (match !== null) {
    mentions.push(match[2]);
    match = mentionRegex.exec(content);
  }
  return [...new Set(mentions)];
}

export async function getCommentsByIdeaId(ideaId: string) {
  return prisma.comment.findMany({
    where: {
      ideaId,
      parentId: null,
      deletedAt: null,
    },
    include: COMMENT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function addComment(params: {
  ideaId: string;
  authorId: string;
  content: string;
  parentId?: string;
  isPrivate?: boolean;
  perspective?: string;
}) {
  const { ideaId, authorId, content, parentId, isPrivate, perspective } =
    params;

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new Error("Parent comment not found");
    }
    // Max 2 levels of nesting: if parent already has a parent, reject deeper nesting
    if (parent.parentId) {
      const grandparent = await prisma.comment.findUnique({
        where: { id: parent.parentId },
      });
      if (grandparent?.parentId) {
        throw new Error("Maximum nesting depth (2 levels) exceeded");
      }
    }
  }

  const mentions = extractMentions(content);

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        content,
        isPrivate: isPrivate ?? false,
        perspective,
        authorId,
        ideaId,
        parentId,
        mentions,
      },
      include: COMMENT_INCLUDE,
    }),
    prisma.idea.update({
      where: { id: ideaId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);

  // Auto-follow the idea when commenting
  await prisma.follow
    .create({
      data: {
        userId: authorId,
        objectType: "IDEA",
        objectId: ideaId,
      },
    })
    .catch(() => {
      // Already following — ignore unique constraint violation
    });

  // Create activity log
  await prisma.activityLog.create({
    data: {
      actorId: authorId,
      action: "COMMENT_ADDED",
      objectType: "IDEA",
      objectId: ideaId,
      details: { commentId: comment.id },
    },
  });

  // Create notifications for mentioned users
  if (mentions.length > 0) {
    await createMentionNotifications(mentions, authorId, ideaId, comment.id);
  }

  // Notify followers of the idea (except the comment author)
  await notifyIdeaFollowers(ideaId, authorId, comment.id);

  return comment;
}

export async function updateComment(params: {
  commentId: string;
  userId: string;
  content: string;
}) {
  const existing = await prisma.comment.findUnique({
    where: { id: params.commentId },
  });

  if (!existing) {
    throw new Error("Comment not found");
  }
  if (existing.authorId !== params.userId) {
    throw new Error("Not authorized to edit this comment");
  }
  if (existing.deletedAt) {
    throw new Error("Cannot edit a deleted comment");
  }

  const mentions = extractMentions(params.content);

  return prisma.comment.update({
    where: { id: params.commentId },
    data: {
      content: params.content,
      mentions,
    },
    include: COMMENT_INCLUDE,
  });
}

export async function deleteComment(commentId: string, userId: string) {
  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!existing) {
    throw new Error("Comment not found");
  }
  if (existing.authorId !== userId) {
    throw new Error("Not authorized to delete this comment");
  }

  const [comment] = await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
      include: COMMENT_INCLUDE,
    }),
    ...(existing.ideaId
      ? [
          prisma.idea.update({
            where: { id: existing.ideaId },
            data: { commentCount: { decrement: 1 } },
          }),
        ]
      : []),
  ]);

  return comment;
}

export async function flagComment(commentId: string, userId: string) {
  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!existing) {
    throw new Error("Comment not found");
  }

  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      isFlagged: true,
      flagCount: { increment: 1 },
    },
    include: COMMENT_INCLUDE,
  });

  await prisma.activityLog.create({
    data: {
      actorId: userId,
      action: "COMMENT_FLAGGED",
      objectType: "COMMENT",
      objectId: commentId,
      details: { ideaId: existing.ideaId },
    },
  });

  return comment;
}

async function createMentionNotifications(
  mentionedUserIds: string[],
  authorId: string,
  ideaId: string,
  commentId: string,
) {
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true, displayName: true },
  });

  const authorName =
    author?.displayName ?? `${author?.firstName} ${author?.lastName}`;

  const notifications = mentionedUserIds
    .filter((uid) => uid !== authorId)
    .map((userId) => ({
      userId,
      type: "MENTION",
      title: `${authorName} mentioned you in a comment`,
      link: `/ideas/${ideaId}#comment-${commentId}`,
      metadata: { commentId, ideaId, authorId },
    }));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}

async function notifyIdeaFollowers(
  ideaId: string,
  authorId: string,
  commentId: string,
) {
  const followers = await prisma.follow.findMany({
    where: {
      objectType: "IDEA",
      objectId: ideaId,
      userId: { not: authorId },
    },
    select: { userId: true },
  });

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true, displayName: true },
  });

  const authorName =
    author?.displayName ?? `${author?.firstName} ${author?.lastName}`;

  const notifications = followers.map(({ userId }) => ({
    userId,
    type: "COMMENT_ADDED",
    title: `${authorName} commented on an idea you follow`,
    link: `/ideas/${ideaId}#comment-${commentId}`,
    metadata: { commentId, ideaId, authorId },
  }));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}

export async function searchMentionableUsers(query: string, limit = 10) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { displayName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
    },
    take: limit,
  });
}
