import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  orgUnitCreateInput,
  orgUnitUpdateInput,
  orgUnitDeleteInput,
  orgUnitGetByIdInput,
  orgUnitAssignUserInput,
  orgUnitRemoveUserInput,
  getOrgUnitTree,
  getOrgUnitById,
  createOrgUnit,
  updateOrgUnit,
  deleteOrgUnit,
  assignUserToOrgUnit,
  removeUserFromOrgUnit,
  OrgUnitServiceError,
} from "@/server/services/org-unit.service";

function handleOrgUnitError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof OrgUnitServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      ORG_UNIT_NOT_FOUND: "NOT_FOUND",
      PARENT_NOT_FOUND: "NOT_FOUND",
      USER_NOT_FOUND: "NOT_FOUND",
      ASSIGNMENT_NOT_FOUND: "NOT_FOUND",
      CIRCULAR_REFERENCE: "BAD_REQUEST",
      HAS_CHILDREN: "CONFLICT",
      HAS_USERS: "CONFLICT",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const adminRouter = createTRPCRouter({
  // ── Org Unit Procedures ────────────────────────────────────

  orgUnitTree: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_ORG_UNITS))
    .query(async () => {
      return getOrgUnitTree();
    }),

  orgUnitGetById: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_ORG_UNITS))
    .input(orgUnitGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getOrgUnitById(input.id);
      } catch (error) {
        handleOrgUnitError(error);
      }
    }),

  orgUnitCreate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_ORG_UNITS))
    .input(orgUnitCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createOrgUnit(input, ctx.session.user.id);
      } catch (error) {
        handleOrgUnitError(error);
      }
    }),

  orgUnitUpdate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_ORG_UNITS))
    .input(orgUnitUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateOrgUnit(input, ctx.session.user.id);
      } catch (error) {
        handleOrgUnitError(error);
      }
    }),

  orgUnitDelete: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_ORG_UNITS))
    .input(orgUnitDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteOrgUnit(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleOrgUnitError(error);
      }
    }),

  orgUnitAssignUser: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_ORG_UNITS))
    .input(orgUnitAssignUserInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await assignUserToOrgUnit(input.orgUnitId, input.userId, ctx.session.user.id);
      } catch (error) {
        handleOrgUnitError(error);
      }
    }),

  orgUnitRemoveUser: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_ORG_UNITS))
    .input(orgUnitRemoveUserInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await removeUserFromOrgUnit(input.orgUnitId, input.userId, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleOrgUnitError(error);
      }
    }),
});
