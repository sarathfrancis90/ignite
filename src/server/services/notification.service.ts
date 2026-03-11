import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type { NotificationListInput, NotificationCreateInput } from "./notification.schemas";

const childLogger = logger.child({ service: "notification" });

export async function listNotifications(userId: string, input: NotificationListInput) {
  const where: Prisma.NotificationWhereInput = { userId };

  if (input.type) {
    where.type = input.type;
  }

  if (input.isRead !== undefined) {
    where.isRead = input.isRead;
  }

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
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType,
      entityId: n.entityId,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new NotificationServiceError("NOT_FOUND", "Notification not found");
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return {
    id: updated.id,
    type: updated.type,
    title: updated.title,
    body: updated.body,
    entityType: updated.entityType,
    entityId: updated.entityId,
    isRead: updated.isRead,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  childLogger.info({ userId, count: result.count }, "Marked all notifications as read");

  return { count: result.count };
}

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

  childLogger.info(
    { notificationId: notification.id, userId: input.userId, type: input.type },
    "Notification created",
  );

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

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    entityType: notification.entityType,
    entityId: notification.entityId,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}

export class NotificationServiceError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}
