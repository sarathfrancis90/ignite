import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
  flagComment,
  CommentServiceError,
} from "./comment.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    commentMention: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    idea: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const commentFindUnique = prisma.comment.findUnique as unknown as Mock;
const commentFindMany = prisma.comment.findMany as unknown as Mock;
const commentUpdate = prisma.comment.update as unknown as Mock;
const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const mockTransaction = prisma.$transaction as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockAuthor = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

const mockIdea = {
  id: "idea-1",
  campaignId: "campaign-1",
  status: "COMMUNITY_DISCUSSION" as const,
};

const mockComment = {
  id: "comment-1",
  content: "This is a great idea!",
  ideaId: "idea-1",
  authorId: "user-1",
  parentId: null,
  flagged: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  author: mockAuthor,
  mentions: [],
  replies: [],
};

const mockReply = {
  id: "comment-2",
  content: "I agree!",
  ideaId: "idea-1",
  authorId: "user-2",
  parentId: "comment-1",
  flagged: false,
  createdAt: new Date("2026-01-02"),
  updatedAt: new Date("2026-01-02"),
  author: { id: "user-2", name: "Other User", email: "other@example.com", image: null },
  mentions: [],
  replies: [],
};

describe("comment.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listComments", () => {
    it("returns paginated top-level comments with replies", async () => {
      commentFindMany.mockResolvedValue([{ ...mockComment, replies: [mockReply] }]);

      const result = await listComments({ ideaId: "idea-1", limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("comment-1");
      expect(result.items[0]?.replies).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
      expect(commentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ideaId: "idea-1", parentId: null },
          take: 21,
        }),
      );
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...mockComment,
        id: `comment-${i + 1}`,
        replies: [],
      }));
      commentFindMany.mockResolvedValue(items);

      const result = await listComments({ ideaId: "idea-1", limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("comment-21");
    });
  });

  describe("getCommentById", () => {
    it("returns a comment by ID", async () => {
      commentFindUnique.mockResolvedValue(mockComment);

      const result = await getCommentById("comment-1");

      expect(result.id).toBe("comment-1");
      expect(result.content).toBe("This is a great idea!");
      expect(result.author).toEqual(mockAuthor);
    });

    it("throws COMMENT_NOT_FOUND when comment does not exist", async () => {
      commentFindUnique.mockResolvedValue(null);

      await expect(getCommentById("nonexistent")).rejects.toThrow(CommentServiceError);
      await expect(getCommentById("nonexistent")).rejects.toMatchObject({
        code: "COMMENT_NOT_FOUND",
      });
    });
  });

  describe("createComment", () => {
    it("creates a top-level comment successfully", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      (prisma.comment.create as unknown as Mock).mockResolvedValue(mockComment);
      commentFindUnique.mockResolvedValue(mockComment);
      (prisma.idea.update as unknown as Mock).mockResolvedValue(mockIdea);

      const result = await createComment(
        { ideaId: "idea-1", content: "This is a great idea!" },
        "user-1",
      );

      expect(result.id).toBe("comment-1");
      expect(mockEmit).toHaveBeenCalledWith(
        "comment.created",
        expect.objectContaining({
          entity: "comment",
          entityId: "comment-1",
          actor: "user-1",
          metadata: expect.objectContaining({
            ideaId: "idea-1",
            isReply: false,
          }),
        }),
      );
    });

    it("creates a reply to an existing comment", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);
      commentFindUnique.mockResolvedValueOnce({
        id: "comment-1",
        parentId: null,
        ideaId: "idea-1",
      });
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      const replyData = { ...mockReply, author: mockAuthor };
      (prisma.comment.create as unknown as Mock).mockResolvedValue(replyData);
      commentFindUnique.mockResolvedValue(replyData);
      (prisma.idea.update as unknown as Mock).mockResolvedValue(mockIdea);

      const result = await createComment(
        { ideaId: "idea-1", content: "I agree!", parentId: "comment-1" },
        "user-1",
      );

      expect(result.id).toBe("comment-2");
      expect(mockEmit).toHaveBeenCalledWith(
        "comment.created",
        expect.objectContaining({
          metadata: expect.objectContaining({
            isReply: true,
            parentId: "comment-1",
          }),
        }),
      );
    });

    it("throws IDEA_NOT_FOUND when idea does not exist", async () => {
      ideaFindUnique.mockResolvedValue(null);

      await expect(
        createComment({ ideaId: "nonexistent", content: "Test" }, "user-1"),
      ).rejects.toMatchObject({
        code: "IDEA_NOT_FOUND",
      });
    });

    it("throws PARENT_NOT_FOUND when parent comment does not exist", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);
      commentFindUnique.mockResolvedValue(null);

      await expect(
        createComment({ ideaId: "idea-1", content: "Test", parentId: "nonexistent" }, "user-1"),
      ).rejects.toMatchObject({
        code: "PARENT_NOT_FOUND",
      });
    });

    it("throws PARENT_IDEA_MISMATCH when parent belongs to different idea", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        parentId: null,
        ideaId: "idea-2",
      });

      await expect(
        createComment({ ideaId: "idea-1", content: "Test", parentId: "comment-1" }, "user-1"),
      ).rejects.toMatchObject({
        code: "PARENT_IDEA_MISMATCH",
      });
    });

    it("emits mention events for mentioned users", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      (prisma.comment.create as unknown as Mock).mockResolvedValue(mockComment);
      commentFindUnique.mockResolvedValue(mockComment);
      (prisma.idea.update as unknown as Mock).mockResolvedValue(mockIdea);
      (prisma.commentMention.createMany as unknown as Mock).mockResolvedValue({ count: 1 });

      await createComment(
        { ideaId: "idea-1", content: "@user-2 check this", mentionedUserIds: ["user-2"] },
        "user-1",
      );

      expect(mockEmit).toHaveBeenCalledWith(
        "comment.mentioned",
        expect.objectContaining({
          metadata: expect.objectContaining({
            mentionedUserId: "user-2",
          }),
        }),
      );
    });

    it("does not emit mention event for self-mention", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      (prisma.comment.create as unknown as Mock).mockResolvedValue(mockComment);
      commentFindUnique.mockResolvedValue(mockComment);
      (prisma.idea.update as unknown as Mock).mockResolvedValue(mockIdea);

      await createComment(
        { ideaId: "idea-1", content: "@self", mentionedUserIds: ["user-1"] },
        "user-1",
      );

      expect(mockEmit).not.toHaveBeenCalledWith("comment.mentioned", expect.anything());
    });
  });

  describe("updateComment", () => {
    it("updates own comment successfully", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        ideaId: "idea-1",
      });
      const updatedComment = { ...mockComment, content: "Updated content" };
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      commentUpdate.mockResolvedValue(updatedComment);

      const result = await updateComment({ id: "comment-1", content: "Updated content" }, "user-1");

      expect(result.content).toBe("Updated content");
      expect(mockEmit).toHaveBeenCalledWith(
        "comment.updated",
        expect.objectContaining({
          entityId: "comment-1",
        }),
      );
    });

    it("throws NOT_AUTHORIZED when updating another user's comment", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        ideaId: "idea-1",
      });

      await expect(
        updateComment({ id: "comment-1", content: "Hacked" }, "user-2"),
      ).rejects.toMatchObject({
        code: "NOT_AUTHORIZED",
      });
    });

    it("throws COMMENT_NOT_FOUND when comment does not exist", async () => {
      commentFindUnique.mockResolvedValue(null);

      await expect(
        updateComment({ id: "nonexistent", content: "Test" }, "user-1"),
      ).rejects.toMatchObject({
        code: "COMMENT_NOT_FOUND",
      });
    });
  });

  describe("deleteComment", () => {
    it("deletes own comment successfully", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        ideaId: "idea-1",
        _count: { replies: 0 },
      });
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      (prisma.comment.delete as unknown as Mock).mockResolvedValue(mockComment);
      (prisma.idea.update as unknown as Mock).mockResolvedValue(mockIdea);

      const result = await deleteComment("comment-1", "user-1", false);

      expect(result.id).toBe("comment-1");
      expect(mockEmit).toHaveBeenCalledWith(
        "comment.deleted",
        expect.objectContaining({
          entityId: "comment-1",
          metadata: expect.objectContaining({
            repliesDeleted: 0,
          }),
        }),
      );
    });

    it("allows moderator to delete any comment", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        ideaId: "idea-1",
        _count: { replies: 2 },
      });
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      (prisma.comment.delete as unknown as Mock).mockResolvedValue(mockComment);
      (prisma.idea.update as unknown as Mock).mockResolvedValue(mockIdea);

      const result = await deleteComment("comment-1", "moderator-1", true);

      expect(result.id).toBe("comment-1");
    });

    it("throws NOT_AUTHORIZED when non-author, non-moderator tries to delete", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        ideaId: "idea-1",
        _count: { replies: 0 },
      });

      await expect(deleteComment("comment-1", "user-2", false)).rejects.toMatchObject({
        code: "NOT_AUTHORIZED",
      });
    });

    it("throws COMMENT_NOT_FOUND when comment does not exist", async () => {
      commentFindUnique.mockResolvedValue(null);

      await expect(deleteComment("nonexistent", "user-1", false)).rejects.toMatchObject({
        code: "COMMENT_NOT_FOUND",
      });
    });

    it("decrements idea commentsCount by 1 + reply count", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        ideaId: "idea-1",
        _count: { replies: 3 },
      });
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      (prisma.comment.delete as unknown as Mock).mockResolvedValue(mockComment);
      (prisma.idea.update as unknown as Mock).mockResolvedValue(mockIdea);

      await deleteComment("comment-1", "user-1", false);

      expect(prisma.idea.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { commentsCount: { decrement: 4 } },
        }),
      );
    });
  });

  describe("flagComment", () => {
    it("flags a comment as inappropriate", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        ideaId: "idea-1",
        flagged: false,
      });
      commentUpdate.mockResolvedValue({ ...mockComment, flagged: true });

      const result = await flagComment({ id: "comment-1", flagged: true }, "moderator-1");

      expect(result.flagged).toBe(true);
      expect(commentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { flagged: true },
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        "comment.flagged",
        expect.objectContaining({
          entityId: "comment-1",
          metadata: expect.objectContaining({
            flagged: true,
          }),
        }),
      );
    });

    it("unflags a flagged comment", async () => {
      commentFindUnique.mockResolvedValue({
        id: "comment-1",
        ideaId: "idea-1",
        flagged: true,
      });
      commentUpdate.mockResolvedValue({ ...mockComment, flagged: false });

      const result = await flagComment({ id: "comment-1", flagged: false }, "moderator-1");

      expect(result.flagged).toBe(false);
      expect(mockEmit).toHaveBeenCalledWith(
        "comment.unflagged",
        expect.objectContaining({
          entityId: "comment-1",
        }),
      );
    });

    it("throws COMMENT_NOT_FOUND when comment does not exist", async () => {
      commentFindUnique.mockResolvedValue(null);

      await expect(
        flagComment({ id: "nonexistent", flagged: true }, "moderator-1"),
      ).rejects.toMatchObject({
        code: "COMMENT_NOT_FOUND",
      });
    });
  });
});
