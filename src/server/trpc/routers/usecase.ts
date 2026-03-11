import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  useCaseListInput,
  useCaseGetByIdInput,
  useCaseCreateInput,
  useCaseUpdateInput,
  useCaseDeleteInput,
  useCaseTransitionInput,
  useCaseArchiveInput,
  useCaseUnarchiveInput,
  useCasePipelineFunnelInput,
  useCaseTeamAddInput,
  useCaseTeamRemoveInput,
  useCaseTeamListInput,
  useCaseTaskListInput,
  useCaseTaskCreateInput,
  useCaseTaskUpdateInput,
  useCaseTaskDeleteInput,
  useCaseDiscussionListInput,
  useCaseDiscussionCreateInput,
  useCaseDiscussionDeleteInput,
  useCaseAttachmentListInput,
  useCaseAttachmentCreateInput,
  useCaseAttachmentDeleteInput,
  useCaseInteractionListInput,
  useCaseInteractionCreateInput,
  useCaseInteractionDeleteInput,
  listUseCases,
  getUseCaseById,
  createUseCase,
  updateUseCase,
  deleteUseCase,
  transitionUseCase,
  archiveUseCase,
  unarchiveUseCase,
  getPipelineFunnel,
  listTeamMembers,
  addTeamMember,
  removeTeamMember,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listDiscussions,
  createDiscussion,
  deleteDiscussion,
  listAttachments,
  createAttachment,
  deleteAttachment,
  listInteractions,
  createInteraction,
  deleteInteraction,
  UseCaseServiceError,
} from "@/server/services/usecase.service";

function handleUseCaseError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof UseCaseServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN"> = {
      USE_CASE_NOT_FOUND: "NOT_FOUND",
      ORGANIZATION_NOT_FOUND: "NOT_FOUND",
      TASK_NOT_FOUND: "NOT_FOUND",
      DISCUSSION_NOT_FOUND: "NOT_FOUND",
      ATTACHMENT_NOT_FOUND: "NOT_FOUND",
      INTERACTION_NOT_FOUND: "NOT_FOUND",
      MEMBER_NOT_FOUND: "NOT_FOUND",
      INVALID_TRANSITION: "BAD_REQUEST",
      CANNOT_ARCHIVE: "BAD_REQUEST",
      CANNOT_UNARCHIVE: "BAD_REQUEST",
      ALREADY_MEMBER: "CONFLICT",
      NOT_AUTHOR: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const useCaseRouter = createTRPCRouter({
  // ── Use Case CRUD ──────────────────────────────────────

  list: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseListInput)
    .query(async ({ input }) => {
      return listUseCases(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getUseCaseById(input.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.USE_CASE_CREATE))
    .input(useCaseCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createUseCase(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUseCase(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.USE_CASE_DELETE))
    .input(useCaseDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteUseCase(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // ── Pipeline Transitions ──────────────────────────────

  transition: protectedProcedure
    .use(requirePermission(Action.USE_CASE_TRANSITION))
    .input(useCaseTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionUseCase(input.id, input.targetStatus, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission(Action.USE_CASE_TRANSITION))
    .input(useCaseArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveUseCase(input.id, input.reason, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  unarchive: protectedProcedure
    .use(requirePermission(Action.USE_CASE_TRANSITION))
    .input(useCaseUnarchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unarchiveUseCase(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // ── Pipeline Funnel ──────────────────────────────────

  pipelineFunnel: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCasePipelineFunnelInput)
    .query(async ({ input }) => {
      return getPipelineFunnel(input.organizationId);
    }),

  // ── Team Members ──────────────────────────────────────

  listTeamMembers: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseTeamListInput)
    .query(async ({ input }) => {
      try {
        return await listTeamMembers(input.useCaseId);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  addTeamMember: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TEAM))
    .input(useCaseTeamAddInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addTeamMember(input.useCaseId, input.userId, input.role, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  removeTeamMember: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TEAM))
    .input(useCaseTeamRemoveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeTeamMember(input.useCaseId, input.userId, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // ── Tasks ──────────────────────────────────────────

  listTasks: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseTaskListInput)
    .query(async ({ input }) => {
      return listTasks(input);
    }),

  createTask: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TASKS))
    .input(useCaseTaskCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createTask(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  updateTask: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TASKS))
    .input(useCaseTaskUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateTask(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  deleteTask: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TASKS))
    .input(useCaseTaskDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteTask(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // ── Discussions ──────────────────────────────────────

  listDiscussions: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseDiscussionListInput)
    .query(async ({ input }) => {
      return listDiscussions(input);
    }),

  createDiscussion: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseDiscussionCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createDiscussion(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  deleteDiscussion: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseDiscussionDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteDiscussion(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // ── Attachments ──────────────────────────────────────

  listAttachments: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseAttachmentListInput)
    .query(async ({ input }) => {
      return listAttachments(input.useCaseId);
    }),

  createAttachment: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseAttachmentCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createAttachment(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  deleteAttachment: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseAttachmentDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteAttachment(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // ── Interactions ──────────────────────────────────────

  listInteractions: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseInteractionListInput)
    .query(async ({ input }) => {
      return listInteractions(input);
    }),

  createInteraction: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseInteractionCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createInteraction(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  deleteInteraction: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseInteractionDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteInteraction(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),
});
