import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  campaignCreateInput,
  campaignUpdateInput,
  campaignListInput,
  campaignGetByIdInput,
  campaignTransitionInput,
  campaignGetTransitionsInput,
  campaignRevertInput,
  campaignCopyInput,
  campaignSponsorViewInput,
  campaignSponsorCommentInput,
  campaignSponsorApproveInput,
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  transitionCampaign,
  getCampaignTransitions,
  revertCampaignPhase,
  copyCampaign,
  getSponsorView,
  addSponsorComment,
  approveSponsorShortlist,
  CampaignServiceError,
} from "@/server/services/campaign.service";
import {
  campaignMemberSetInput,
  campaignMemberListInput,
  userSearchInput,
  searchUsers,
  setCampaignMembers,
  listCampaignMembers,
} from "@/server/services/campaign-member.service";
import {
  campaignKpiInput,
  getCampaignKpis,
  getCampaignKpiTimeSeries,
} from "@/server/services/kpi.service";
import { z } from "zod";

function handleCampaignError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof CampaignServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      INVALID_TRANSITION: "BAD_REQUEST",
      GUARD_FAILED: "BAD_REQUEST",
      NO_PREVIOUS_STATUS: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const campaignRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.CAMPAIGN_READ))
    .input(campaignListInput)
    .query(async ({ input }) => {
      return listCampaigns(input);
    }),

  getById: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_READ, (input) => input.id))
    .input(campaignGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getCampaignById(input.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.CAMPAIGN_CREATE))
    .input(campaignCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_UPDATE, (input) => input.id))
    .input(campaignUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  getTransitions: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_READ, (input) => input.id))
    .input(campaignGetTransitionsInput)
    .query(async ({ input }) => {
      try {
        return await getCampaignTransitions(input.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  transition: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_TRANSITION, (input) => input.id))
    .input(campaignTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionCampaign(input.id, input.targetStatus, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  revert: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_TRANSITION, (input) => input.id))
    .input(campaignRevertInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await revertCampaignPhase(input.id, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  searchUsers: protectedProcedure
    .use(requirePermission(Action.CAMPAIGN_READ))
    .input(userSearchInput)
    .query(async ({ input }) => {
      return searchUsers(input);
    }),

  setMembers: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.CAMPAIGN_ASSIGN_ROLES,
        (input) => input.campaignId,
      ),
    )
    .input(campaignMemberSetInput)
    .mutation(async ({ ctx, input }) => {
      return setCampaignMembers(input, ctx.session.user.id);
    }),

  listMembers: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(Action.CAMPAIGN_READ, (input) => input.campaignId),
    )
    .input(campaignMemberListInput)
    .query(async ({ input }) => {
      return listCampaignMembers(input);
    }),

  getKpis: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(Action.CAMPAIGN_READ, (input) => input.campaignId),
    )
    .input(campaignKpiInput)
    .query(async ({ input }) => {
      return getCampaignKpis(input.campaignId);
    }),

  getKpiTimeSeries: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(Action.CAMPAIGN_READ, (input) => input.campaignId),
    )
    .input(
      z.object({
        campaignId: z.string().cuid(),
        days: z.number().int().min(1).max(365).default(30),
      }),
    )
    .query(async ({ input }) => {
      return getCampaignKpiTimeSeries(input.campaignId, input.days);
    }),

  copy: protectedProcedure
    .use(
      requirePermission<{ sourceCampaignId: string }>(
        Action.CAMPAIGN_COPY,
        (input) => input.sourceCampaignId,
      ),
    )
    .input(campaignCopyInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await copyCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  getSponsorView: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.CAMPAIGN_SPONSOR_VIEW,
        (input) => input.campaignId,
      ),
    )
    .input(campaignSponsorViewInput)
    .query(async ({ input }) => {
      try {
        return await getSponsorView(input);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  sponsorComment: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.CAMPAIGN_SPONSOR_COMMENT,
        (input) => input.campaignId,
      ),
    )
    .input(campaignSponsorCommentInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addSponsorComment(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  sponsorApprove: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.CAMPAIGN_SPONSOR_APPROVE,
        (input) => input.campaignId,
      ),
    )
    .input(campaignSponsorApproveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await approveSponsorShortlist(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),
});
