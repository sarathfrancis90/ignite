import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus } from "./event-bus";
import { type EventPayload } from "./types";

describe("EventBus", () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  it("emits and receives events", () => {
    const handler = vi.fn();
    eventBus.on("idea.submitted", handler);

    const payload: EventPayload = {
      entity: "idea",
      entityId: "cuid123",
      actor: "user1",
      timestamp: new Date().toISOString(),
    };

    eventBus.emit("idea.submitted", payload);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("unregisters handlers with off", () => {
    const handler = vi.fn();
    eventBus.on("campaign.created", handler);
    eventBus.off("campaign.created", handler);

    eventBus.emit("campaign.created", {
      entity: "campaign",
      entityId: "cuid456",
      actor: "user2",
      timestamp: new Date().toISOString(),
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("reports listener count", () => {
    const handler = vi.fn();
    expect(eventBus.listenerCount("idea.voted")).toBe(0);

    eventBus.on("idea.voted", handler);
    expect(eventBus.listenerCount("idea.voted")).toBe(1);
  });

  it("passes metadata through events", () => {
    const handler = vi.fn();
    eventBus.on("campaign.phaseChanged", handler);

    const payload: EventPayload = {
      entity: "campaign",
      entityId: "cuid789",
      actor: "admin1",
      timestamp: new Date().toISOString(),
      metadata: { fromPhase: "DRAFT", toPhase: "SEEDING" },
    };

    eventBus.emit("campaign.phaseChanged", payload);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { fromPhase: "DRAFT", toPhase: "SEEDING" },
      }),
    );
  });
});
