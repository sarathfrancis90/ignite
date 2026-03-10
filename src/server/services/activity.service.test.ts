import { describe, expect, it, vi } from "vitest";
import {
  logActivity,
  getActivityFeed,
  type ActivityDeps,
} from "./activity.service";
import { ActivityEventType } from "@/types/activity";

describe("logActivity", () => {
  it("creates an activity log entry", async () => {
    const createActivityLog = vi.fn().mockResolvedValue({ id: "log-1" });

    const result = await logActivity(
      ActivityEventType.IDEA_SUBMITTED,
      "idea-1",
      "actor-1",
      { title: "Test Idea" },
      { createActivityLog },
    );

    expect(createActivityLog).toHaveBeenCalledWith({
      eventType: "IDEA_SUBMITTED",
      ideaId: "idea-1",
      actorId: "actor-1",
      metadata: { title: "Test Idea" },
    });
    expect(result.id).toBe("log-1");
  });

  it("supports null ideaId for non-idea events", async () => {
    const createActivityLog = vi.fn().mockResolvedValue({ id: "log-2" });

    await logActivity(
      ActivityEventType.IDEA_ARCHIVED,
      null,
      "actor-1",
      {},
      { createActivityLog },
    );

    expect(createActivityLog).toHaveBeenCalledWith({
      eventType: "IDEA_ARCHIVED",
      ideaId: null,
      actorId: "actor-1",
      metadata: {},
    });
  });
});

describe("getActivityFeed", () => {
  it("returns activity feed with cursor-based pagination", async () => {
    const mockItems = [
      {
        id: "log-1",
        eventType: ActivityEventType.IDEA_SUBMITTED,
        ideaId: "idea-1",
        actorId: "actor-1",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
        actor: {
          id: "actor-1",
          displayName: "John Doe",
          firstName: "John",
          lastName: "Doe",
          avatarUrl: null,
        },
      },
    ];

    const getActivityLogs = vi.fn().mockResolvedValue({
      items: mockItems,
      nextCursor: "cursor-2",
    });

    const result = await getActivityFeed("idea-1", undefined, 20, {
      getActivityLogs,
    });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe("cursor-2");
    expect(getActivityLogs).toHaveBeenCalledWith({
      ideaId: "idea-1",
      cursor: undefined,
      limit: 20,
    });
  });
});
