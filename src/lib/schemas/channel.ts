import { z } from "zod";

/**
 * Client-safe channel schemas for form validation.
 * These are duplicated from server schemas to respect import boundaries
 * (src/server/ must never be imported from client components).
 */
export const channelCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional(),
  teaser: z.string().max(500).optional(),
  problemStatement: z.string().max(10000).optional(),
});

export type ChannelCreateInput = z.infer<typeof channelCreateInput>;
