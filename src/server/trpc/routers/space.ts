import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  spaceListInput,
  spaceCreateInput,
  spaceUpdateInput,
  spaceGetByIdInput,
  spaceArchiveInput,
  spaceActivateInput,
  spaceAddMemberInput,
  spaceRemoveMemberInput,
  spaceChangeMemberRoleInput,
  spaceAddMembersInput,
  listSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  archiveSpace,
  activateSpace,
  addMember,
  addMembers,
  removeMember,
  changeMemberRole,
  isInnovationSpacesEnabled,
  SpaceServiceError,
} from "@/server/services/space.service";

function handleSpaceError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof SpaceServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      SPACE_NOT_FOUND: "NOT_FOUND",
      USER_NOT_FOUND: "NOT_FOUND",
      MEMBERSHIP_NOT_FOUND: "NOT_FOUND",
      SLUG_ALREADY_EXISTS: "CONFLICT",
      ALREADY_ARCHIVED: "BAD_REQUEST",
      ALREADY_ACTIVE: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

function ensureFeatureEnabled(): void {
  if (!isInnovationSpacesEnabled()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Innovation Spaces feature is not enabled",
    });
  }
}

export const spaceRouter = createTRPCRouter({
  isEnabled: protectedProcedure.query(() => {
    return { enabled: isInnovationSpacesEnabled() };
  }),

  list: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceListInput)
    .query(async ({ input }) => {
      ensureFeatureEnabled();
      return listSpaces(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceGetByIdInput)
    .query(async ({ input }) => {
      ensureFeatureEnabled();
      try {
        return await getSpaceById(input.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceCreateInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        return await createSpace(input, ctx.session.user.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceUpdateInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        return await updateSpace(input, ctx.session.user.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceArchiveInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        return await archiveSpace(input.id, ctx.session.user.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  activate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceActivateInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        return await activateSpace(input.id, ctx.session.user.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  addMember: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceAddMemberInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        return await addMember(input.spaceId, input.userId, input.role, ctx.session.user.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  addMembers: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceAddMembersInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        return await addMembers(input.spaceId, input.userIds, input.role, ctx.session.user.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  removeMember: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceRemoveMemberInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        await removeMember(input.spaceId, input.userId, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleSpaceError(error);
      }
    }),

  changeMemberRole: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SPACES))
    .input(spaceChangeMemberRoleInput)
    .mutation(async ({ ctx, input }) => {
      ensureFeatureEnabled();
      try {
        return await changeMemberRole(input.spaceId, input.userId, input.role, ctx.session.user.id);
      } catch (error) {
        handleSpaceError(error);
      }
    }),
});
