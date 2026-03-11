import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "IDEA_SUBMITTED",
  "IDEA_STATUS_CHANGED",
  "IDEA_HOT_GRADUATION",
  "EVALUATION_REQUESTED",
  "CAMPAIGN_PHASE_CHANGED",
  "COMMENT_ON_FOLLOWED",
  "ROLE_ASSIGNED",
  "SYSTEM",
] as const;

export const notificationListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  isRead: z.boolean().optional(),
});

export const notificationMarkReadInput = z.object({
  id: z.string().cuid(),
});

export const notificationMarkAllReadInput = z.object({});

export const notificationCreateInput = z.object({
  userId: z.string().cuid(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  entityType: z.string().max(50).optional(),
  entityId: z.string().cuid().optional(),
});

export type NotificationListInput = z.infer<typeof notificationListInput>;
export type NotificationMarkReadInput = z.infer<typeof notificationMarkReadInput>;
export type NotificationCreateInput = z.infer<typeof notificationCreateInput>;
