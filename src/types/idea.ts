import { z } from "zod";

export const splitIdeaInputSchema = z.object({
  ideaId: z.string().min(1),
  splits: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
      }),
    )
    .min(2, "Must split into at least 2 ideas"),
  archiveOriginal: z.boolean().default(true),
});

export const mergeIdeasInputSchema = z.object({
  ideaIds: z
    .array(z.string().min(1))
    .min(2, "Must select at least 2 ideas to merge"),
  campaignId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
});

export const bulkAssignBucketInputSchema = z.object({
  ideaIds: z.array(z.string().min(1)).min(1),
  bucketId: z.string().min(1),
});

export const bulkArchiveInputSchema = z.object({
  ideaIds: z.array(z.string().min(1)).min(1),
  reason: z.string().optional(),
});

export const bulkExportInputSchema = z.object({
  ideaIds: z.array(z.string().min(1)).min(1),
  format: z.enum(["json", "csv"]).default("json"),
});

export type SplitIdeaInput = z.infer<typeof splitIdeaInputSchema>;
export type MergeIdeasInput = z.infer<typeof mergeIdeasInputSchema>;
export type BulkAssignBucketInput = z.infer<typeof bulkAssignBucketInputSchema>;
export type BulkArchiveInput = z.infer<typeof bulkArchiveInputSchema>;
export type BulkExportInput = z.infer<typeof bulkExportInputSchema>;
