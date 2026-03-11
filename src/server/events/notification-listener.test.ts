import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { registerNotificationListeners } from "./notification-listener";

vi.mock("./event-bus", () => ({
  eventBus: {
    on: vi.fn(),
  },
}));

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: { findUnique: vi.fn() },
    campaign: { findUnique: vi.fn() },
    campaignMember: { findMany: vi.fn() },
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  createNotification: vi.fn(),
  createBulkNotifications: vi.fn(),
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

const { eventBus } = await import("./event-bus");
const mockOn = eventBus.on as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerNotificationListeners", () => {
  it("registers all expected event handlers", () => {
    registerNotificationListeners();

    const registeredEvents = mockOn.mock.calls.map((call) => (call as [string, unknown])[0]);

    expect(registeredEvents).toContain("idea.submitted");
    expect(registeredEvents).toContain("idea.statusChanged");
    expect(registeredEvents).toContain("campaign.phaseChanged");
    expect(registeredEvents).toContain("comment.created");
    expect(registeredEvents).toContain("comment.mentioned");
    expect(registeredEvents).toContain("rbac.roleAssigned");
    expect(registeredEvents).toContain("rbac.roleRemoved");
    expect(registeredEvents).toHaveLength(7);
  });
});
