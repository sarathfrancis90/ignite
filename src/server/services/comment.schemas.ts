import { z } from "zod";

// ── Comment Input Schemas ────────────────────────────────────

export const commentCreateInput = z.object({
  ideaId: z.string(),
  content: z.string().min(1, "Comment cannot be empty").max(10000),
  parentId: z.string().optional(),
  mentionedUserIds: z.array(z.string()).max(20).optional(),
});

export const commentUpdateInput = z.object({
  id: z.string(),
  content: z.string().min(1, "Comment cannot be empty").max(10000),
  mentionedUserIds: z.array(z.string()).max(20).optional(),
});

export const commentDeleteInput = z.object({
  id: z.string(),
});

export const commentFlagInput = z.object({
  id: z.string(),
  flagged: z.boolean(),
});

export const commentListInput = z.object({
  ideaId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const commentGetByIdInput = z.object({
  id: z.string(),
});

export type CommentCreateInput = z.infer<typeof commentCreateInput>;
export type CommentUpdateInput = z.infer<typeof commentUpdateInput>;
export type CommentDeleteInput = z.infer<typeof commentDeleteInput>;
export type CommentFlagInput = z.infer<typeof commentFlagInput>;
export type CommentListInput = z.infer<typeof commentListInput>;
