import { describe, it, expect } from "vitest";
import {
  getValidTransitions,
  isValidTransition,
  getTransitionGuards,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_PHASE_ORDER,
  GUARD_FAILURE_MESSAGES,
} from "./campaign-transitions";

describe("campaign-transitions", () => {
  describe("getValidTransitions", () => {
    const allPhasesEnabled = { hasSeedingPhase: true, hasDiscussionPhase: true };

    it("returns SEEDING and SUBMISSION from DRAFT when seeding enabled", () => {
      const transitions = getValidTransitions("DRAFT", allPhasesEnabled);
      expect(transitions).toEqual(["SEEDING", "SUBMISSION"]);
    });

    it("returns only SUBMISSION from DRAFT when seeding disabled", () => {
      const transitions = getValidTransitions("DRAFT", {
        hasSeedingPhase: false,
        hasDiscussionPhase: true,
      });
      expect(transitions).toEqual(["SUBMISSION"]);
    });

    it("returns SUBMISSION from SEEDING", () => {
      const transitions = getValidTransitions("SEEDING", allPhasesEnabled);
      expect(transitions).toEqual(["SUBMISSION"]);
    });

    it("returns DISCUSSION_VOTING and EVALUATION from SUBMISSION when discussion enabled", () => {
      const transitions = getValidTransitions("SUBMISSION", allPhasesEnabled);
      expect(transitions).toEqual(["DISCUSSION_VOTING", "EVALUATION"]);
    });

    it("returns only EVALUATION from SUBMISSION when discussion disabled", () => {
      const transitions = getValidTransitions("SUBMISSION", {
        hasSeedingPhase: true,
        hasDiscussionPhase: false,
      });
      expect(transitions).toEqual(["EVALUATION"]);
    });

    it("returns EVALUATION from DISCUSSION_VOTING", () => {
      const transitions = getValidTransitions("DISCUSSION_VOTING", allPhasesEnabled);
      expect(transitions).toEqual(["EVALUATION"]);
    });

    it("returns CLOSED from EVALUATION", () => {
      const transitions = getValidTransitions("EVALUATION", allPhasesEnabled);
      expect(transitions).toEqual(["CLOSED"]);
    });

    it("returns empty array from CLOSED", () => {
      const transitions = getValidTransitions("CLOSED", allPhasesEnabled);
      expect(transitions).toEqual([]);
    });
  });

  describe("isValidTransition", () => {
    const allPhasesEnabled = { hasSeedingPhase: true, hasDiscussionPhase: true };

    it("allows DRAFT -> SUBMISSION", () => {
      expect(isValidTransition("DRAFT", "SUBMISSION", allPhasesEnabled)).toBe(true);
    });

    it("disallows DRAFT -> EVALUATION", () => {
      expect(isValidTransition("DRAFT", "EVALUATION", allPhasesEnabled)).toBe(false);
    });

    it("disallows CLOSED -> DRAFT", () => {
      expect(isValidTransition("CLOSED", "DRAFT", allPhasesEnabled)).toBe(false);
    });

    it("disallows backward transitions", () => {
      expect(isValidTransition("SUBMISSION", "DRAFT", allPhasesEnabled)).toBe(false);
    });

    it("disallows DRAFT -> SEEDING when seeding phase disabled", () => {
      expect(
        isValidTransition("DRAFT", "SEEDING", {
          hasSeedingPhase: false,
          hasDiscussionPhase: true,
        }),
      ).toBe(false);
    });
  });

  describe("getTransitionGuards", () => {
    it("returns SEEDING_TEAM_ASSIGNED for DRAFT -> SEEDING", () => {
      const guards = getTransitionGuards("DRAFT", "SEEDING");
      expect(guards).toEqual(["SEEDING_TEAM_ASSIGNED"]);
    });

    it("returns HAS_AT_LEAST_ONE_IDEA for SUBMISSION -> DISCUSSION_VOTING", () => {
      const guards = getTransitionGuards("SUBMISSION", "DISCUSSION_VOTING");
      expect(guards).toEqual(["HAS_AT_LEAST_ONE_IDEA"]);
    });

    it("returns HAS_AT_LEAST_ONE_IDEA for SUBMISSION -> EVALUATION", () => {
      const guards = getTransitionGuards("SUBMISSION", "EVALUATION");
      expect(guards).toEqual(["HAS_AT_LEAST_ONE_IDEA"]);
    });

    it("returns ALL_EVALUATIONS_COMPLETE for EVALUATION -> CLOSED", () => {
      const guards = getTransitionGuards("EVALUATION", "CLOSED");
      expect(guards).toEqual(["ALL_EVALUATIONS_COMPLETE"]);
    });

    it("returns empty array for transitions without guards", () => {
      expect(getTransitionGuards("DRAFT", "SUBMISSION")).toEqual([]);
      expect(getTransitionGuards("SEEDING", "SUBMISSION")).toEqual([]);
      expect(getTransitionGuards("DISCUSSION_VOTING", "EVALUATION")).toEqual([]);
    });
  });

  describe("CAMPAIGN_STATUS_LABELS", () => {
    it("has labels for all statuses", () => {
      expect(CAMPAIGN_STATUS_LABELS.DRAFT).toBe("Draft");
      expect(CAMPAIGN_STATUS_LABELS.SEEDING).toBe("Seeding");
      expect(CAMPAIGN_STATUS_LABELS.SUBMISSION).toBe("Submission");
      expect(CAMPAIGN_STATUS_LABELS.DISCUSSION_VOTING).toBe("Discussion & Voting");
      expect(CAMPAIGN_STATUS_LABELS.EVALUATION).toBe("Evaluation");
      expect(CAMPAIGN_STATUS_LABELS.CLOSED).toBe("Closed");
    });
  });

  describe("CAMPAIGN_PHASE_ORDER", () => {
    it("contains all 6 phases in order", () => {
      expect(CAMPAIGN_PHASE_ORDER).toEqual([
        "DRAFT",
        "SEEDING",
        "SUBMISSION",
        "DISCUSSION_VOTING",
        "EVALUATION",
        "CLOSED",
      ]);
    });
  });

  describe("GUARD_FAILURE_MESSAGES", () => {
    it("has messages for all guard IDs", () => {
      expect(GUARD_FAILURE_MESSAGES.SEEDING_TEAM_ASSIGNED).toBeDefined();
      expect(GUARD_FAILURE_MESSAGES.HAS_AT_LEAST_ONE_IDEA).toBeDefined();
      expect(GUARD_FAILURE_MESSAGES.ALL_EVALUATIONS_COMPLETE).toBeDefined();
    });
  });
});
