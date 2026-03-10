import { describe, expect, it } from "vitest";
import {
  findTransition,
  getValidTransitions,
  IdeaStatus,
  validateTransition,
  type TransitionContext,
} from "./idea";

function makeContext(
  overrides: Partial<TransitionContext> = {},
): TransitionContext {
  return {
    ideaId: "test-idea-1",
    actorId: "test-actor-1",
    ideaStatus: IdeaStatus.DRAFT,
    ...overrides,
  };
}

describe("Idea State Machine", () => {
  describe("getValidTransitions", () => {
    it("returns transitions for DRAFT status", () => {
      const transitions = getValidTransitions(IdeaStatus.DRAFT);
      expect(transitions).toHaveLength(2);
      expect(transitions.map((t) => t.to)).toContain(IdeaStatus.QUALIFICATION);
      expect(transitions.map((t) => t.to)).toContain(
        IdeaStatus.COMMUNITY_DISCUSSION,
      );
    });

    it("returns HOT transition for COMMUNITY_DISCUSSION status", () => {
      const transitions = getValidTransitions(IdeaStatus.COMMUNITY_DISCUSSION);
      const hotTransition = transitions.find((t) => t.to === IdeaStatus.HOT);
      expect(hotTransition).toBeDefined();
      expect(hotTransition?.effects).toContain("idea.graduated");
      expect(hotTransition?.effects).toContain("idea.statusChanged");
    });

    it("returns empty array for IMPLEMENTED status (terminal state)", () => {
      const transitions = getValidTransitions(IdeaStatus.IMPLEMENTED);
      expect(transitions).toHaveLength(0);
    });

    it("returns unarchive transitions for ARCHIVED status", () => {
      const transitions = getValidTransitions(IdeaStatus.ARCHIVED);
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.map((t) => t.to)).toContain(
        IdeaStatus.COMMUNITY_DISCUSSION,
      );
    });
  });

  describe("findTransition", () => {
    it("finds valid transition from COMMUNITY_DISCUSSION to HOT", () => {
      const transition = findTransition(
        IdeaStatus.COMMUNITY_DISCUSSION,
        IdeaStatus.HOT,
      );
      expect(transition).toBeDefined();
      expect(transition?.to).toBe(IdeaStatus.HOT);
    });

    it("returns undefined for invalid transition", () => {
      const transition = findTransition(IdeaStatus.DRAFT, IdeaStatus.HOT);
      expect(transition).toBeUndefined();
    });

    it("returns undefined for transition from terminal state", () => {
      const transition = findTransition(
        IdeaStatus.IMPLEMENTED,
        IdeaStatus.DRAFT,
      );
      expect(transition).toBeUndefined();
    });
  });

  describe("validateTransition", () => {
    it("validates COMMUNITY_DISCUSSION to HOT when campaign is in DISCUSSION_VOTING", async () => {
      const ctx = makeContext({
        ideaStatus: IdeaStatus.COMMUNITY_DISCUSSION,
        campaignStatus: "DISCUSSION_VOTING",
      });
      const result = await validateTransition(
        IdeaStatus.COMMUNITY_DISCUSSION,
        IdeaStatus.HOT,
        ctx,
      );
      expect(result.valid).toBe(true);
    });

    it("rejects COMMUNITY_DISCUSSION to HOT when campaign is only in SUBMISSION", async () => {
      const ctx = makeContext({
        ideaStatus: IdeaStatus.COMMUNITY_DISCUSSION,
        campaignStatus: "SUBMISSION",
      });
      const result = await validateTransition(
        IdeaStatus.COMMUNITY_DISCUSSION,
        IdeaStatus.HOT,
        ctx,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Guard rejected");
    });

    it("rejects invalid transition", async () => {
      const ctx = makeContext({ ideaStatus: IdeaStatus.DRAFT });
      const result = await validateTransition(
        IdeaStatus.DRAFT,
        IdeaStatus.HOT,
        ctx,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Invalid transition");
    });

    it("allows COMMUNITY_DISCUSSION to ARCHIVED without campaign ceiling check", async () => {
      const ctx = makeContext({
        ideaStatus: IdeaStatus.COMMUNITY_DISCUSSION,
        campaignStatus: "SUBMISSION",
      });
      const result = await validateTransition(
        IdeaStatus.COMMUNITY_DISCUSSION,
        IdeaStatus.ARCHIVED,
        ctx,
      );
      expect(result.valid).toBe(true);
    });

    it("validates transition effects include expected events", () => {
      const transition = findTransition(
        IdeaStatus.COMMUNITY_DISCUSSION,
        IdeaStatus.HOT,
      );
      expect(transition?.effects).toContain("idea.graduated");
      expect(transition?.effects).toContain("idea.statusChanged");
    });

    it("validates QUALIFICATION to COMMUNITY_DISCUSSION fires idea.published", () => {
      const transition = findTransition(
        IdeaStatus.QUALIFICATION,
        IdeaStatus.COMMUNITY_DISCUSSION,
      );
      expect(transition?.effects).toContain("idea.published");
    });
  });
});
