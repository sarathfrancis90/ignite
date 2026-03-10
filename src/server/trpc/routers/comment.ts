import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  commentCreateInput,
  commentUpdateInput,
  commentDeleteInput,
  commentFlagInput,
  commentListInput,
  commentGetByIdInput,
  listComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
  flagComment,
  CommentServiceError,
} from "@/server/services/comment.service";
import { checkPermission } from "@/server/services/rbac.service";

function handleCommentError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof CommentServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      COMMENT_NOT_FOUND: "NOT_FOUND",
      IDEA_NOT_FOUND: "NOT_FOUND",
      PARENT_NOT_FOUND: "NOT_FOUND",
      PARENT_IDEA_MISMATCH: "BAD_REQUEST",
      MAX_NESTING_EXCEEDED: "BAD_REQUEST",
      CREATE_FAILED: "BAD_REQUEST",
      NOT_AUTHORIZED: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const commentRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.COMMENT_READ))
    .input(commentListInput)
    .query(async ({ input }) => {
      return listComments(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.COMMENT_READ))
    .input(commentGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getCommentById(input.id);
      } catch (error) {
        handleCommentError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.COMMENT_CREATE))
    .input(commentCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createComment(input, ctx.session.user.id);
      } catch (error) {
        handleCommentError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.COMMENT_UPDATE_OWN))
    .input(commentUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateComment(input, ctx.session.user.id);
      } catch (error) {
        handleCommentError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.COMMENT_DELETE_OWN))
    .input(commentDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const canDeleteAny = await checkPermission(ctx.session.user.id, Action.COMMENT_DELETE_ANY);
        return await deleteComment(input.id, ctx.session.user.id, canDeleteAny);
      } catch (error) {
        handleCommentError(error);
      }
    }),

  flag: protectedProcedure
    .use(requirePermission(Action.COMMENT_MODERATE))
    .input(commentFlagInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await flagComment(input, ctx.session.user.id);
      } catch (error) {
        handleCommentError(error);
      }
    }),
});
