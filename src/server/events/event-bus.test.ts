import { describe, expect, it, vi, beforeEach } from "vitest";
import { eventBus } from "./event-bus";
import type { IdeaGraduatedEvent, CommentCreatedEvent } from "@/types/events";

beforeEach(() => {
  eventBus.removeAllListeners();
});

describe("EventBus", () => {
  it("emits and receives typed events", () => {
    const handler = vi.fn();
    eventBus.on("idea.graduated", handler);

    const payload: IdeaGraduatedEvent = {
      entity: { id: "idea-1", title: "Test", campaignId: "campaign-1" },
      actor: { id: "actor-1", displayName: "Test User" },
      timestamp: new Date(),
    };

    eventBus.emit("idea.graduated", payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("supports multiple listeners for the same event", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    eventBus.on("idea.graduated", handler1);
    eventBus.on("idea.graduated", handler2);

    const payload: IdeaGraduatedEvent = {
      entity: { id: "idea-1", title: "Test", campaignId: "campaign-1" },
      actor: { id: "actor-1", displayName: "Test User" },
      timestamp: new Date(),
    };

    eventBus.emit("idea.graduated", payload);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("does not call handlers for different events", () => {
    const handler = vi.fn();
    eventBus.on("idea.graduated", handler);

    const payload: CommentCreatedEvent = {
      entity: { id: "comment-1", ideaId: "idea-1", isPrivate: false },
      actor: { id: "actor-1", displayName: "Test User" },
      timestamp: new Date(),
    };

    eventBus.emit("comment.created", payload);

    expect(handler).not.toHaveBeenCalled();
  });

  it("can remove a specific listener", () => {
    const handler = vi.fn();
    eventBus.on("idea.graduated", handler);
    eventBus.off("idea.graduated", handler);

    const payload: IdeaGraduatedEvent = {
      entity: { id: "idea-1", title: "Test", campaignId: "campaign-1" },
      actor: { id: "actor-1", displayName: "Test User" },
      timestamp: new Date(),
    };

    eventBus.emit("idea.graduated", payload);

    expect(handler).not.toHaveBeenCalled();
  });

  it("removes all listeners", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    eventBus.on("idea.graduated", handler1);
    eventBus.on("comment.created", handler2);

    eventBus.removeAllListeners();

    const payload: IdeaGraduatedEvent = {
      entity: { id: "idea-1", title: "Test", campaignId: "campaign-1" },
      actor: { id: "actor-1", displayName: "Test User" },
      timestamp: new Date(),
    };

    eventBus.emit("idea.graduated", payload);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});
