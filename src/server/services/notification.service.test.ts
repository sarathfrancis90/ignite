import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createNotification,
  createBulkNotifications,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  NotificationServiceError,
} from "./notification.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const notificationCreate = prisma.notification.create as unknown as Mock;
const notificationCreateMany = prisma.notification.createMany as unknown as Mock;
const notificationFindMany = prisma.notification.findMany as unknown as Mock;
const notificationFindUnique = prisma.notification.findUnique as unknown as Mock;
const notificationFindUniqueOrThrow = prisma.notification.findUniqueOrThrow as unknown as Mock;
const notificationUpdate = prisma.notification.update as unknown as Mock;
const notificationUpdateMany = prisma.notification.updateMany as unknown as Mock;
const notificationDelete = prisma.notification.delete as unknown as Mock;
const notificationCount = prisma.notification.count as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockNotification = {
  id: "notif-1",
  userId: "user-1",
  type: "IDEA_SUBMITTED",
  title: "New idea submitted",
  body: 'An idea "Test Idea" was submitted',
  entityType: "idea",
  entityId: "idea-1",
  isRead: false,
  readAt: null,
  createdAt: new Date("2026-03-10T10:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createNotification", () => {
  it("creates a notification and emits event", async () => {
    notificationCreate.mockResolvedValue(mockNotification);

    const result = await createNotification({
      userId: "user-1",
      type: "IDEA_SUBMITTED",
      title: "New idea submitted",
      body: 'An idea "Test Idea" was submitted',
      entityType: "idea",
      entityId: "idea-1",
    });

    expect(notificationCreate).toHaveBeenCalledOnce();
    expect(result.id).toBe("notif-1");
    expect(result.userId).toBe("user-1");
    expect(result.type).toBe("IDEA_SUBMITTED");
    expect(result.isRead).toBe(false);
    expect(result.createdAt).toBe("2026-03-10T10:00:00.000Z");
    expect(mockEmit).toHaveBeenCalledWith(
      "notification.created",
      expect.objectContaining({
        entity: "notification",
        entityId: "notif-1",
      }),
    );
  });
});

describe("createBulkNotifications", () => {
  it("creates notifications for multiple users", async () => {
    notificationCreateMany.mockResolvedValue({ count: 3 });

    await createBulkNotifications(["user-1", "user-2", "user-3"], {
      type: "CAMPAIGN_PHASE_CHANGED",
      title: "Campaign phase changed",
      body: "Campaign moved to submission phase",
      entityType: "campaign",
      entityId: "campaign-1",
    });

    expect(notificationCreateMany).toHaveBeenCalledOnce();
    const callData = notificationCreateMany.mock.calls[0][0].data;
    expect(callData).toHaveLength(3);
  });

  it("deduplicates user IDs", async () => {
    notificationCreateMany.mockResolvedValue({ count: 2 });

    await createBulkNotifications(["user-1", "user-1", "user-2"], {
      type: "CAMPAIGN_PHASE_CHANGED",
      title: "Phase changed",
      body: "Test body",
    });

    const callData = notificationCreateMany.mock.calls[0][0].data;
    expect(callData).toHaveLength(2);
  });

  it("does nothing for empty user array", async () => {
    const result = await createBulkNotifications([], {
      type: "SYSTEM",
      title: "Test",
      body: "Test body",
    });

    expect(result).toEqual([]);
    expect(notificationCreateMany).not.toHaveBeenCalled();
  });
});

describe("listNotifications", () => {
  it("returns paginated notifications", async () => {
    const notifications = [mockNotification, { ...mockNotification, id: "notif-2" }];
    notificationFindMany.mockResolvedValue(notifications);

    const result = await listNotifications("user-1", { limit: 20, unreadOnly: false });

    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        take: 21,
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when more items exist", async () => {
    const notifications = Array.from({ length: 3 }, (_, i) => ({
      ...mockNotification,
      id: `notif-${i}`,
    }));
    notificationFindMany.mockResolvedValue(notifications);

    const result = await listNotifications("user-1", { limit: 2, unreadOnly: false });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("notif-2");
  });

  it("filters by type when specified", async () => {
    notificationFindMany.mockResolvedValue([]);

    await listNotifications("user-1", {
      limit: 20,
      type: "COMMENT_MENTION",
      unreadOnly: false,
    });

    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", type: "COMMENT_MENTION" },
      }),
    );
  });

  it("filters unread only when specified", async () => {
    notificationFindMany.mockResolvedValue([]);

    await listNotifications("user-1", { limit: 20, unreadOnly: true });

    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isRead: false },
      }),
    );
  });
});

describe("getUnreadCount", () => {
  it("returns unread count", async () => {
    notificationCount.mockResolvedValue(5);

    const result = await getUnreadCount("user-1");

    expect(result.count).toBe(5);
    expect(notificationCount).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
    });
  });
});

describe("markAsRead", () => {
  it("marks a notification as read", async () => {
    notificationFindUnique.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      isRead: false,
    });
    notificationUpdate.mockResolvedValue({
      ...mockNotification,
      isRead: true,
      readAt: new Date("2026-03-11T10:00:00Z"),
    });

    const result = await markAsRead("notif-1", "user-1");

    expect(result.isRead).toBe(true);
    expect(notificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif-1" },
        data: { isRead: true, readAt: expect.any(Date) },
      }),
    );
  });

  it("throws when notification not found", async () => {
    notificationFindUnique.mockResolvedValue(null);

    await expect(markAsRead("nonexistent", "user-1")).rejects.toThrow(NotificationServiceError);
  });

  it("throws when user does not own notification", async () => {
    notificationFindUnique.mockResolvedValue({
      id: "notif-1",
      userId: "user-2",
      isRead: false,
    });

    await expect(markAsRead("notif-1", "user-1")).rejects.toThrow("You can only mark your own");
  });

  it("returns existing notification if already read", async () => {
    const alreadyRead = { ...mockNotification, isRead: true, readAt: new Date() };
    notificationFindUnique.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      isRead: true,
    });
    notificationFindUniqueOrThrow.mockResolvedValue(alreadyRead);

    const result = await markAsRead("notif-1", "user-1");

    expect(notificationUpdate).not.toHaveBeenCalled();
    expect(result.isRead).toBe(true);
  });
});

describe("markAllAsRead", () => {
  it("marks all unread notifications as read", async () => {
    notificationUpdateMany.mockResolvedValue({ count: 10 });

    const result = await markAllAsRead("user-1", {});

    expect(result.count).toBe(10);
    expect(notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isRead: false },
      }),
    );
  });

  it("filters by type when specified", async () => {
    notificationUpdateMany.mockResolvedValue({ count: 3 });

    await markAllAsRead("user-1", { type: "COMMENT_MENTION" });

    expect(notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isRead: false, type: "COMMENT_MENTION" },
      }),
    );
  });
});

describe("deleteNotification", () => {
  it("deletes own notification", async () => {
    notificationFindUnique.mockResolvedValue({ id: "notif-1", userId: "user-1" });
    notificationDelete.mockResolvedValue(mockNotification);

    const result = await deleteNotification("notif-1", "user-1");

    expect(result.id).toBe("notif-1");
    expect(notificationDelete).toHaveBeenCalledWith({ where: { id: "notif-1" } });
  });

  it("throws when notification not found", async () => {
    notificationFindUnique.mockResolvedValue(null);

    await expect(deleteNotification("nonexistent", "user-1")).rejects.toThrow(
      NotificationServiceError,
    );
  });

  it("throws when user does not own notification", async () => {
    notificationFindUnique.mockResolvedValue({ id: "notif-1", userId: "user-2" });

    await expect(deleteNotification("notif-1", "user-1")).rejects.toThrow(
      "You can only delete your own",
    );
  });
});
