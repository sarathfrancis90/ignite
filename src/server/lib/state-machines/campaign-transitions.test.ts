import { describe, it, expect } from "vitest";
import {
  getValidTransitions,
  isValidTransition,
  CAMPAIGN_STATUS_LABELS,
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
});
