import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock("@/server/queues/email.queue", () => ({
  enqueueImmediateEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

import { registerEmailListeners } from "./email.listener";
import { eventBus } from "@/server/events/event-bus";

describe("email.listener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers listener for notification.created event", () => {
    registerEmailListeners();

    expect(eventBus.on).toHaveBeenCalledWith("notification.created", expect.any(Function));
  });

  it("registers exactly one listener", () => {
    registerEmailListeners();

    expect(eventBus.on).toHaveBeenCalledTimes(1);
  });
});
