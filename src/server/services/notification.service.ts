import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  NotificationCreateInput,
  NotificationListInput,
  NotificationMarkAllReadInput,
} from "./notification.schemas";

export {
  notificationCreateInput,
  notificationListInput,
  notificationMarkReadInput,
  notificationMarkAllReadInput,
  notificationDeleteInput,
} from "./notification.schemas";

export type {
  NotificationCreateInput,
  NotificationListInput,
  NotificationMarkReadInput,
  NotificationMarkAllReadInput,
  NotificationDeleteInput,
} from "./notification.schemas";

const childLogger = logger.child({ service: "notification" });

function serializeNotification(notification: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    entityType: notification.entityType,
    entityId: notification.entityId,
    isRead: notification.isRead,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

/**
 * Create a notification for a user.
 */
export async function createNotification(input: NotificationCreateInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  eventBus.emit("notification.created", {
    entity: "notification",
    entityId: notification.id,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: {
      userId: input.userId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  childLogger.info(
    { notificationId: notification.id, userId: input.userId, type: input.type },
    "Notification created",
  );

  return serializeNotification(notification);
}

/**
 * Create notifications for multiple users at once.
 */
export async function createBulkNotifications(
  userIds: string[],
  data: Omit<NotificationCreateInput, "userId">,
) {
  if (userIds.length === 0) return [];

  const uniqueUserIds = [...new Set(userIds)];

  await prisma.notification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      entityType: data.entityType,
      entityId: data.entityId,
    })),
  });

  childLogger.info(
    { recipientCount: uniqueUserIds.length, type: data.type },
    "Bulk notifications created",
  );
}

/**
 * List notifications for a user with cursor-based pagination.
 */
export async function listNotifications(userId: string, input: NotificationListInput) {
  const where = {
    userId,
    ...(input.type ? { type: input.type } : {}),
    ...(input.unreadOnly ? { isRead: false } : {}),
  };

  const items = await prisma.notification.findMany({
    where,
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(serializeNotification),
    nextCursor,
  };
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { count };
}

/**
 * Mark a single notification as read. Only the notification owner can do this.
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, isRead: true },
  });

  if (!notification) {
    throw new NotificationServiceError("Notification not found", "NOTIFICATION_NOT_FOUND");
  }

  if (notification.userId !== userId) {
    throw new NotificationServiceError(
      "You can only mark your own notifications as read",
      "NOT_AUTHORIZED",
    );
  }

  if (notification.isRead) {
    return serializeNotification(
      await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } }),
    );
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  childLogger.info({ notificationId, userId }, "Notification marked as read");

  return serializeNotification(updated);
}

/**
 * Mark all notifications as read for a user, optionally filtered by type.
 */
export async function markAllAsRead(userId: string, input: NotificationMarkAllReadInput) {
  const where = {
    userId,
    isRead: false,
    ...(input.type ? { type: input.type } : {}),
  };

  const result = await prisma.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  });

  childLogger.info(
    { userId, updatedCount: result.count, type: input.type },
    "All notifications marked as read",
  );

  return { count: result.count };
}

/**
 * Delete a single notification. Only the notification owner can do this.
 */
export async function deleteNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification) {
    throw new NotificationServiceError("Notification not found", "NOTIFICATION_NOT_FOUND");
  }

  if (notification.userId !== userId) {
    throw new NotificationServiceError(
      "You can only delete your own notifications",
      "NOT_AUTHORIZED",
    );
  }

  await prisma.notification.delete({ where: { id: notificationId } });

  childLogger.info({ notificationId, userId }, "Notification deleted");

  return { id: notificationId };
}

export class NotificationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}
