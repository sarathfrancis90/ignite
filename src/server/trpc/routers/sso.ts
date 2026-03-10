import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  ssoProviderCreateInput,
  ssoProviderUpdateInput,
  ssoProviderGetByIdInput,
  ssoProviderDeleteInput,
  ssoProviderListInput,
  ssoProviderToggleInput,
  attributeMappingCreateInput,
  attributeMappingUpdateInput,
  attributeMappingDeleteInput,
  attributeMappingListInput,
  groupMappingCreateInput,
  groupMappingUpdateInput,
  groupMappingDeleteInput,
  groupMappingListInput,
} from "@/server/services/sso.schemas";
import {
  createSsoProvider,
  updateSsoProvider,
  deleteSsoProvider,
  getSsoProviderById,
  listSsoProviders,
  toggleSsoProvider,
  createAttributeMapping,
  updateAttributeMapping,
  deleteAttributeMapping,
  listAttributeMappings,
  createGroupMapping,
  updateGroupMapping,
  deleteGroupMapping,
  listGroupMappings,
  getEnabledSsoProviders,
  SsoServiceError,
} from "@/server/services/sso.service";

function handleSsoError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof SsoServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      PROVIDER_NOT_FOUND: "NOT_FOUND",
      MAPPING_NOT_FOUND: "NOT_FOUND",
      GROUP_NOT_FOUND: "NOT_FOUND",
      NAME_EXISTS: "CONFLICT",
      PROVIDER_ENABLED: "BAD_REQUEST",
      INCOMPLETE_CONFIG: "BAD_REQUEST",
      INVALID_TARGET_VALUE: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const ssoRouter = createTRPCRouter({
  // ── Public: Get enabled providers for login page ──────────────
  enabledProviders: publicProcedure.query(async () => {
    return getEnabledSsoProviders();
  }),

  // ── Provider CRUD ─────────────────────────────────────────────

  providerList: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(ssoProviderListInput)
    .query(async ({ input }) => {
      return listSsoProviders(input);
    }),

  providerGetById: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(ssoProviderGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getSsoProviderById(input.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  providerCreate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(ssoProviderCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createSsoProvider(input, ctx.session.user.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  providerUpdate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(ssoProviderUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateSsoProvider(input, ctx.session.user.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  providerDelete: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(ssoProviderDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteSsoProvider(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleSsoError(error);
      }
    }),

  providerToggle: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(ssoProviderToggleInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleSsoProvider(input.id, input.isEnabled, ctx.session.user.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  // ── Attribute Mapping CRUD ────────────────────────────────────

  attributeMappingList: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(attributeMappingListInput)
    .query(async ({ input }) => {
      try {
        return await listAttributeMappings(input.ssoProviderId);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  attributeMappingCreate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(attributeMappingCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createAttributeMapping(input, ctx.session.user.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  attributeMappingUpdate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(attributeMappingUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAttributeMapping(input, ctx.session.user.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  attributeMappingDelete: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(attributeMappingDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteAttributeMapping(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleSsoError(error);
      }
    }),

  // ── Group Mapping CRUD ────────────────────────────────────────

  groupMappingList: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(groupMappingListInput)
    .query(async ({ input }) => {
      try {
        return await listGroupMappings(input.ssoProviderId);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  groupMappingCreate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(groupMappingCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createGroupMapping(input, ctx.session.user.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  groupMappingUpdate: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(groupMappingUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateGroupMapping(input, ctx.session.user.id);
      } catch (error) {
        handleSsoError(error);
      }
    }),

  groupMappingDelete: protectedProcedure
    .use(requirePermission(Action.ADMIN_MANAGE_SSO))
    .input(groupMappingDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteGroupMapping(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleSsoError(error);
      }
    }),
});
