import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  NotificationServiceError,
} from "./notification.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const mockNotification = {
  id: "notif_1",
  userId: "user_1",
  type: "IDEA_SUBMITTED" as const,
  title: "New idea submitted",
  body: "An idea was submitted in your campaign",
  entityType: "idea",
  entityId: "idea_1",
  isRead: false,
  createdAt: new Date("2026-03-01T12:00:00Z"),
};

describe("notification.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listNotifications", () => {
    it("lists notifications with pagination", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotification]);

      const result = await listNotifications("user_1", { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.title).toBe("New idea submitted");
      expect(result.items[0]?.isRead).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns next cursor when more items exist", async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...mockNotification,
        id: `notif_${i}`,
      }));
      vi.mocked(prisma.notification.findMany).mockResolvedValue(items);

      const result = await listNotifications("user_1", { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("notif_20");
    });

    it("filters by type", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);

      await listNotifications("user_1", {
        limit: 20,
        type: "CAMPAIGN_PHASE_CHANGED",
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user_1", type: "CAMPAIGN_PHASE_CHANGED" },
        }),
      );
    });

    it("filters by read status", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);

      await listNotifications("user_1", { limit: 20, isRead: false });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user_1", isRead: false },
        }),
      );
    });
  });

  describe("getUnreadCount", () => {
    it("returns unread notification count", async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(5);

      const count = await getUnreadCount("user_1");

      expect(count).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "user_1", isRead: false },
      });
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(mockNotification);
      vi.mocked(prisma.notification.update).mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await markAsRead("user_1", "notif_1");

      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "notif_1" },
        data: { isRead: true },
      });
    });

    it("throws NOT_FOUND if notification does not belong to user", async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

      await expect(markAsRead("user_1", "notif_999")).rejects.toThrow(NotificationServiceError);
      await expect(markAsRead("user_1", "notif_999")).rejects.toThrow("Notification not found");
    });
  });

  describe("markAllAsRead", () => {
    it("marks all unread notifications as read", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 });

      const result = await markAllAsRead("user_1");

      expect(result.count).toBe(3);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user_1", isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe("createNotification", () => {
    it("creates a notification and emits event", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification);

      const result = await createNotification({
        userId: "user_1",
        type: "IDEA_SUBMITTED",
        title: "New idea submitted",
        body: "An idea was submitted in your campaign",
        entityType: "idea",
        entityId: "idea_1",
      });

      expect(result.id).toBe("notif_1");
      expect(result.title).toBe("New idea submitted");
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "user_1",
          type: "IDEA_SUBMITTED",
          title: "New idea submitted",
          body: "An idea was submitted in your campaign",
          entityType: "idea",
          entityId: "idea_1",
        },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "notification.created",
        expect.objectContaining({
          entity: "notification",
          entityId: "notif_1",
        }),
      );
    });
  });
});
