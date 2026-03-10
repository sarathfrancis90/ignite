import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  ideaCreateInput,
  ideaUpdateInput,
  ideaListInput,
  ideaGetByIdInput,
  ideaSubmitInput,
  ideaDeleteInput,
  ideaTransitionInput,
  ideaArchiveInput,
  ideaUnarchiveInput,
  coachQualifyInput,
  ideaGetTransitionsInput,
  listIdeas,
  getIdeaById,
  createIdea,
  updateIdea,
  submitIdea,
  deleteIdea,
  transitionIdea,
  archiveIdea,
  unarchiveIdea,
  coachQualify,
  getIdeaTransitions,
  IdeaServiceError,
} from "@/server/services/idea.service";

function handleIdeaError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof IdeaServiceError) {
    const codeMap: Record<
      string,
      "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "PRECONDITION_FAILED"
    > = {
      IDEA_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_ACCEPTING: "BAD_REQUEST",
      INVALID_STATUS: "BAD_REQUEST",
      INVALID_TRANSITION: "BAD_REQUEST",
      ALREADY_ARCHIVED: "BAD_REQUEST",
      NO_PREVIOUS_STATUS: "BAD_REQUEST",
      GUARD_FAILED: "PRECONDITION_FAILED",
      NOT_AUTHORIZED: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const ideaRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission<{ campaignId: string }>(Action.IDEA_READ, (input) => input.campaignId))
    .input(ideaListInput)
    .query(async ({ input }) => {
      return listIdeas(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(ideaGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getIdeaById(input.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission<{ campaignId: string }>(Action.IDEA_CREATE, (input) => input.campaignId))
    .input(ideaCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.IDEA_UPDATE_OWN))
    .input(ideaUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  submit: protectedProcedure
    .use(requirePermission(Action.IDEA_CREATE))
    .input(ideaSubmitInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitIdea(input.id, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.IDEA_DELETE_OWN))
    .input(ideaDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteIdea(input.id, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  transition: protectedProcedure
    .use(requirePermission(Action.IDEA_TRANSITION))
    .input(ideaTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission(Action.IDEA_MODERATE))
    .input(ideaArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  unarchive: protectedProcedure
    .use(requirePermission(Action.IDEA_MODERATE))
    .input(ideaUnarchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unarchiveIdea(input.id, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  coachQualify: protectedProcedure
    .use(requirePermission(Action.IDEA_TRANSITION))
    .input(coachQualifyInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await coachQualify(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  getTransitions: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(ideaGetTransitionsInput)
    .query(async ({ input }) => {
      try {
        return await getIdeaTransitions(input.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),
});
