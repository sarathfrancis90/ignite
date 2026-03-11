import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerNotificationListeners } from "./notification.listener";

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { on: vi.fn(), emit: vi.fn() },
}));

vi.mock("@/server/services/notification.service", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: { findUnique: vi.fn() },
    campaign: { findUnique: vi.fn() },
    campaignMember: { findMany: vi.fn() },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

const { eventBus } = await import("@/server/events/event-bus");

describe("notification.listener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerNotificationListeners", () => {
    it("registers handlers for all expected events", () => {
      registerNotificationListeners();

      expect(eventBus.on).toHaveBeenCalledWith("idea.submitted", expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith("idea.statusChanged", expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith("idea.transitioned", expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith("campaign.phaseChanged", expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith("rbac.roleAssigned", expect.any(Function));
    });
  });
});
