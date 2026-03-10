import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/lib/trpc";
import {
  getCommentsByIdeaId,
  addComment,
  updateComment,
  deleteComment,
  flagComment,
  searchMentionableUsers,
} from "@/server/services/comment.service";
import { emitCommentEvent } from "@/lib/socket-emitter";

export const commentRouter = router({
  list: publicProcedure
    .input(z.object({ ideaId: z.string().min(1) }))
    .query(async ({ input }) => {
      return getCommentsByIdeaId(input.ideaId);
    }),

  add: protectedProcedure
    .input(
      z.object({
        ideaId: z.string().min(1),
        content: z.string().min(1).max(10000),
        parentId: z.string().optional(),
        isPrivate: z.boolean().optional(),
        perspective: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await addComment({
        ideaId: input.ideaId,
        authorId: ctx.userId,
        content: input.content,
        parentId: input.parentId,
        isPrivate: input.isPrivate,
        perspective: input.perspective,
      });

      emitCommentEvent({
        type: "comment:added",
        ideaId: input.ideaId,
        comment: comment as never,
      });

      return comment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        commentId: z.string().min(1),
        content: z.string().min(1).max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await updateComment({
        commentId: input.commentId,
        userId: ctx.userId,
        content: input.content,
      });

      if (comment.ideaId) {
        emitCommentEvent({
          type: "comment:updated",
          ideaId: comment.ideaId,
          comment: comment as never,
        });
      }

      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await deleteComment(input.commentId, ctx.userId);

      if (comment.ideaId) {
        emitCommentEvent({
          type: "comment:deleted",
          ideaId: comment.ideaId,
          comment: comment as never,
        });
      }

      return comment;
    }),

  flag: protectedProcedure
    .input(z.object({ commentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await flagComment(input.commentId, ctx.userId);

      if (comment.ideaId) {
        emitCommentEvent({
          type: "comment:flagged",
          ideaId: comment.ideaId,
          comment: comment as never,
        });
      }

      return comment;
    }),

  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      return searchMentionableUsers(input.query);
    }),
});
