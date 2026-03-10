import { z } from "zod";

// ============================================================
// Bucket Zod Schemas
// ============================================================

export const BUCKET_COLORS = [
  "#6366F1", // Indigo (default)
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#64748B", // Slate
] as const;

export const smartFilterSchema = z.object({
  status: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  minVoteScore: z.number().optional(),
  maxVoteScore: z.number().optional(),
  minLikeCount: z.number().optional(),
  minCommentCount: z.number().optional(),
  isHot: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
});

export type SmartFilter = z.infer<typeof smartFilterSchema>;

export const createBucketSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  name: z
    .string()
    .min(1, "Bucket name is required")
    .max(50, "Bucket name must be 50 characters or less"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
});

export const createSmartBucketSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  name: z
    .string()
    .min(1, "Bucket name is required")
    .max(50, "Bucket name must be 50 characters or less"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  filter: smartFilterSchema,
});

export const updateBucketSchema = z.object({
  bucketId: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  filter: smartFilterSchema.optional(),
});

export const deleteBucketSchema = z.object({
  bucketId: z.string().min(1),
});

export const listBucketsSchema = z.object({
  campaignId: z.string().min(1),
});

export const getBucketItemsSchema = z.object({
  bucketId: z.string().min(1),
});

export const assignIdeaToBucketSchema = z.object({
  ideaId: z.string().min(1),
  bucketId: z.string().min(1),
});

export const removeIdeaFromBucketSchema = z.object({
  ideaId: z.string().min(1),
  bucketId: z.string().min(1),
});

export const bulkAssignBucketSchema = z.object({
  ideaIds: z.array(z.string().min(1)).min(1),
  bucketId: z.string().min(1),
});

export type CreateBucketInput = z.infer<typeof createBucketSchema>;
export type CreateSmartBucketInput = z.infer<typeof createSmartBucketSchema>;
export type UpdateBucketInput = z.infer<typeof updateBucketSchema>;
export type BucketColor = (typeof BUCKET_COLORS)[number];
