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
import {
  userListInput,
  userCreateInput,
  userUpdateInput,
  userToggleActiveInput,
  userGetByIdInput,
  bulkAssignRoleInput,
  bulkAssignOrgUnitInput,
  bulkDeactivateInput,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserActive,
  bulkAssignRole,
  bulkAssignOrgUnit,
  bulkDeactivate,
  UserAdminServiceError,
} from "@/server/services/user-admin.service";
import {
  groupListInput,
  groupCreateInput,
  groupUpdateInput,
  groupDeleteInput,
  groupGetByIdInput,
  groupAddMemberInput,
  groupRemoveMemberInput,
  groupAddMembersInput,
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  addMembers,
  removeMember,
  GroupServiceError,
} from "@/server/services/group.service";

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

function handleUserAdminError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof UserAdminServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN"> = {
      USER_NOT_FOUND: "NOT_FOUND",
      EMAIL_ALREADY_EXISTS: "CONFLICT",
      SELF_DEACTIVATION: "BAD_REQUEST",
      ORG_UNIT_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

function handleGroupError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof GroupServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      GROUP_NOT_FOUND: "NOT_FOUND",
      USER_NOT_FOUND: "NOT_FOUND",
      MEMBERSHIP_NOT_FOUND: "NOT_FOUND",
      NAME_ALREADY_EXISTS: "CONFLICT",
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

  // ── User Administration Procedures ──────────────────────────

  userList: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_USERS))
    .input(userListInput)
    .query(async ({ input }) => {
      return listUsers(input);
    }),

  userGetById: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_USERS))
    .input(userGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getUserById(input.userId);
      } catch (error) {
        handleUserAdminError(error);
      }
    }),

  userCreate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_USERS))
    .input(userCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createUser(input, ctx.session.user.id);
      } catch (error) {
        handleUserAdminError(error);
      }
    }),

  userUpdate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_USERS))
    .input(userUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUser(input, ctx.session.user.id);
      } catch (error) {
        handleUserAdminError(error);
      }
    }),

  userToggleActive: protectedProcedure
    .use(requirePermission(Action.USER_DEACTIVATE))
    .input(userToggleActiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleUserActive(input.userId, input.isActive, ctx.session.user.id);
      } catch (error) {
        handleUserAdminError(error);
      }
    }),

  userBulkAssignRole: protectedProcedure
    .use(requirePermission(Action.USER_CHANGE_ROLE))
    .input(bulkAssignRoleInput)
    .mutation(async ({ ctx, input }) => {
      return bulkAssignRole(input.userIds, input.globalRole, ctx.session.user.id);
    }),

  userBulkAssignOrgUnit: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_USERS))
    .input(bulkAssignOrgUnitInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkAssignOrgUnit(input.userIds, input.orgUnitId, ctx.session.user.id);
      } catch (error) {
        handleUserAdminError(error);
      }
    }),

  userBulkDeactivate: protectedProcedure
    .use(requirePermission(Action.USER_DEACTIVATE))
    .input(bulkDeactivateInput)
    .mutation(async ({ ctx, input }) => {
      return bulkDeactivate(input.userIds, ctx.session.user.id);
    }),

  // ── Group Management Procedures ─────────────────────────────

  groupList: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupListInput)
    .query(async ({ input }) => {
      return listGroups(input);
    }),

  groupGetById: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getGroupById(input.id);
      } catch (error) {
        handleGroupError(error);
      }
    }),

  groupCreate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createGroup(input, ctx.session.user.id);
      } catch (error) {
        handleGroupError(error);
      }
    }),

  groupUpdate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateGroup(input, ctx.session.user.id);
      } catch (error) {
        handleGroupError(error);
      }
    }),

  groupDelete: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteGroup(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleGroupError(error);
      }
    }),

  groupAddMember: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupAddMemberInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addMember(input.groupId, input.userId, ctx.session.user.id);
      } catch (error) {
        handleGroupError(error);
      }
    }),

  groupAddMembers: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupAddMembersInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addMembers(input.groupId, input.userIds, ctx.session.user.id);
      } catch (error) {
        handleGroupError(error);
      }
    }),

  groupRemoveMember: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_GROUPS))
    .input(groupRemoveMemberInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await removeMember(input.groupId, input.userId, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleGroupError(error);
      }
    }),
});
