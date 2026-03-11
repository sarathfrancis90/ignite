import { z } from "zod";

const useCaseStatusEnum = z.enum([
  "IDENTIFIED",
  "QUALIFICATION",
  "EVALUATION",
  "PILOT",
  "PARTNERSHIP",
  "ARCHIVED",
]);

const useCasePriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

const interactionTypeEnum = z.enum(["NOTE", "MEETING", "EMAIL", "CALL", "DEMO", "OTHER"]);

// ── Use Case CRUD ──────────────────────────────────────────

export const useCaseListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  organizationId: z.string().cuid().optional(),
  status: useCaseStatusEnum.optional(),
  priority: useCasePriorityEnum.optional(),
});

export const useCaseGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const useCaseCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(10000, "Description must be 10000 characters or less").optional(),
  organizationId: z.string().cuid(),
  priority: useCasePriorityEnum.default("MEDIUM"),
  tags: z.array(z.string().max(50)).max(20).default([]),
  estimatedValue: z.string().max(100).optional(),
  targetDate: z.string().datetime().optional(),
});

export const useCaseUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  priority: useCasePriorityEnum.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  estimatedValue: z.string().max(100).optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
});

export const useCaseDeleteInput = z.object({
  id: z.string().cuid(),
});

export const useCaseTransitionInput = z.object({
  id: z.string().cuid(),
  targetStatus: useCaseStatusEnum,
});

export const useCaseArchiveInput = z.object({
  id: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

export const useCaseUnarchiveInput = z.object({
  id: z.string().cuid(),
});

// ── Pipeline funnel ────────────────────────────────────────

export const useCasePipelineFunnelInput = z.object({
  organizationId: z.string().cuid().optional(),
});

// ── Team Members ──────────────────────────────────────────

export const useCaseTeamAddInput = z.object({
  useCaseId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.string().max(50).default("member"),
});

export const useCaseTeamRemoveInput = z.object({
  useCaseId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const useCaseTeamListInput = z.object({
  useCaseId: z.string().cuid(),
});

// ── Tasks (Kanban) ────────────────────────────────────────

export const useCaseTaskListInput = z.object({
  useCaseId: z.string().cuid(),
});

export const useCaseTaskCreateInput = z.object({
  useCaseId: z.string().cuid(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const useCaseTaskUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusEnum.optional(),
  assigneeId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  position: z.number().int().min(0).optional(),
});

export const useCaseTaskDeleteInput = z.object({
  id: z.string().cuid(),
});

// ── Discussions ──────────────────────────────────────────

export const useCaseDiscussionListInput = z.object({
  useCaseId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const useCaseDiscussionCreateInput = z.object({
  useCaseId: z.string().cuid(),
  content: z.string().min(1, "Content is required").max(10000),
  isInternal: z.boolean().default(true),
});

export const useCaseDiscussionDeleteInput = z.object({
  id: z.string().cuid(),
});

// ── Attachments ─────────────────────────────────────────

export const useCaseAttachmentListInput = z.object({
  useCaseId: z.string().cuid(),
});

export const useCaseAttachmentCreateInput = z.object({
  useCaseId: z.string().cuid(),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url().max(2048),
  fileSize: z.number().int().min(1).max(52428800), // 50MB max
  mimeType: z.string().max(100),
});

export const useCaseAttachmentDeleteInput = z.object({
  id: z.string().cuid(),
});

// ── Interactions ────────────────────────────────────────

export const useCaseInteractionListInput = z.object({
  useCaseId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  type: interactionTypeEnum.optional(),
});

export const useCaseInteractionCreateInput = z.object({
  useCaseId: z.string().cuid(),
  type: interactionTypeEnum.default("NOTE"),
  summary: z.string().min(1, "Summary is required").max(500),
  details: z.string().max(10000).optional(),
  occurredAt: z.string().datetime().optional(),
  contactId: z.string().cuid().optional(),
});

export const useCaseInteractionDeleteInput = z.object({
  id: z.string().cuid(),
});

// ── Type exports ────────────────────────────────────────

export type UseCaseListInput = z.infer<typeof useCaseListInput>;
export type UseCaseCreateInput = z.infer<typeof useCaseCreateInput>;
export type UseCaseUpdateInput = z.infer<typeof useCaseUpdateInput>;
export type UseCaseTaskCreateInput = z.infer<typeof useCaseTaskCreateInput>;
export type UseCaseTaskUpdateInput = z.infer<typeof useCaseTaskUpdateInput>;
export type UseCaseDiscussionCreateInput = z.infer<typeof useCaseDiscussionCreateInput>;
export type UseCaseAttachmentCreateInput = z.infer<typeof useCaseAttachmentCreateInput>;
export type UseCaseInteractionCreateInput = z.infer<typeof useCaseInteractionCreateInput>;
export type UseCaseInteractionListInput = z.infer<typeof useCaseInteractionListInput>;
export type UseCaseDiscussionListInput = z.infer<typeof useCaseDiscussionListInput>;
export type UseCaseTaskListInput = z.infer<typeof useCaseTaskListInput>;
