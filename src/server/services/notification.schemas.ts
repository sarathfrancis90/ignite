import { z } from "zod";

export const notificationTypeEnum = z.enum([
  "IDEA_SUBMITTED",
  "IDEA_STATUS_CHANGED",
  "IDEA_HOT_GRADUATION",
  "EVALUATION_REQUESTED",
  "CAMPAIGN_PHASE_CHANGED",
  "COMMENT_ON_FOLLOWED",
  "COMMENT_MENTION",
  "ROLE_ASSIGNED",
  "ROLE_REMOVED",
  "SYSTEM",
]);

export const notificationCreateInput = z.object({
  userId: z.string(),
  type: notificationTypeEnum,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const notificationListInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  type: notificationTypeEnum.optional(),
  unreadOnly: z.boolean().optional().default(false),
});

export const notificationMarkReadInput = z.object({
  id: z.string(),
});

export const notificationMarkAllReadInput = z.object({
  type: notificationTypeEnum.optional(),
});

export const notificationDeleteInput = z.object({
  id: z.string(),
});

export type NotificationCreateInput = z.infer<typeof notificationCreateInput>;
export type NotificationListInput = z.infer<typeof notificationListInput>;
export type NotificationMarkReadInput = z.infer<typeof notificationMarkReadInput>;
export type NotificationMarkAllReadInput = z.infer<typeof notificationMarkAllReadInput>;
export type NotificationDeleteInput = z.infer<typeof notificationDeleteInput>;
