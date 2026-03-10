import { z } from "zod";

// ── Campaign Input Schemas ──────────────────────────────────

export const campaignCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional(),
  teaser: z.string().max(500).optional(),
  submissionCloseDate: z.string().optional(),
  votingCloseDate: z.string().optional(),
  plannedCloseDate: z.string().optional(),
  sponsorId: z.string().cuid().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const campaignUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  teaser: z.string().max(500).optional(),
  bannerUrl: z.string().url().max(2048).optional().nullable(),
  videoUrl: z.string().url().max(2048).optional().nullable(),
  submissionCloseDate: z.string().optional().nullable(),
  votingCloseDate: z.string().optional().nullable(),
  plannedCloseDate: z.string().optional().nullable(),
  hasSeedingPhase: z.boolean().optional(),
  hasDiscussionPhase: z.boolean().optional(),
  hasCommunityGraduation: z.boolean().optional(),
  hasVoting: z.boolean().optional(),
  hasLikes: z.boolean().optional(),
  isConfidentialAllowed: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isShowOnStartPage: z.boolean().optional(),
  graduationVisitors: z.number().int().min(0).optional(),
  graduationCommenters: z.number().int().min(0).optional(),
  graduationLikes: z.number().int().min(0).optional(),
  graduationVoters: z.number().int().min(0).optional(),
  graduationVotingLevel: z.number().min(0).optional(),
  graduationDaysInStatus: z.number().int().min(0).optional(),
  votingCriteria: z.unknown().optional(),
  customFields: z.unknown().optional(),
  settings: z.unknown().optional(),
});

export const campaignListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z
    .enum(["DRAFT", "SEEDING", "SUBMISSION", "DISCUSSION_VOTING", "EVALUATION", "CLOSED"])
    .optional(),
});

export const campaignGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const campaignTransitionInput = z.object({
  id: z.string().cuid(),
  targetStatus: z.enum([
    "DRAFT",
    "SEEDING",
    "SUBMISSION",
    "DISCUSSION_VOTING",
    "EVALUATION",
    "CLOSED",
  ]),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateInput>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateInput>;
export type CampaignListInput = z.infer<typeof campaignListInput>;
export type CampaignTransitionInput = z.infer<typeof campaignTransitionInput>;
