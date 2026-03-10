import { z } from "zod";

export const channelCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional(),
  teaser: z.string().max(500).optional(),
  problemStatement: z.string().max(10000).optional(),
});

export const channelUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  teaser: z.string().max(500).optional(),
  problemStatement: z.string().max(10000).optional().nullable(),
  bannerUrl: z.string().url().max(2048).optional().nullable(),
  hasQualificationPhase: z.boolean().optional(),
  hasDiscussionPhase: z.boolean().optional(),
  hasVoting: z.boolean().optional(),
  hasLikes: z.boolean().optional(),
  votingCriteria: z.record(z.string(), z.unknown()).optional().nullable(),
  customFields: z.record(z.string(), z.unknown()).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const channelListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const channelGetByIdInput = z.object({
  id: z.string().cuid(),
});

export type ChannelCreateInput = z.infer<typeof channelCreateInput>;
export type ChannelUpdateInput = z.infer<typeof channelUpdateInput>;
export type ChannelListInput = z.infer<typeof channelListInput>;
