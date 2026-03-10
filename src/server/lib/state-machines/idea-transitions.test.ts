import { describe, it, expect } from "vitest";
import {
  getValidIdeaTransitions,
  isValidIdeaTransition,
  getIdeaTransitionGuards,
  canUnarchive,
  IDEA_STATUS_LABELS,
  IDEA_PHASE_ORDER,
  IDEA_GUARD_FAILURE_MESSAGES,
  CAMPAIGN_SUBMITTABLE_STATUSES,
  type IdeaFeatureToggles,
} from "./idea-transitions";

const allFeaturesEnabled: IdeaFeatureToggles = {
  hasQualificationPhase: true,
  hasDiscussionPhase: true,
  hasCommunityGraduation: true,
  hasIdeaCoach: true,
};

describe("idea-transitions", () => {
  describe("getValidIdeaTransitions", () => {
    it("returns QUALIFICATION from DRAFT", () => {
      const transitions = getValidIdeaTransitions("DRAFT", allFeaturesEnabled, "SUBMISSION");
      expect(transitions).toEqual(["QUALIFICATION"]);
    });

    it("returns COMMUNITY_DISCUSSION, HOT, ARCHIVED from QUALIFICATION when discussion enabled", () => {
      const transitions = getValidIdeaTransitions(
        "QUALIFICATION",
        allFeaturesEnabled,
        "DISCUSSION_VOTING",
      );
      expect(transitions).toContain("COMMUNITY_DISCUSSION");
      expect(transitions).toContain("HOT");
      expect(transitions).toContain("ARCHIVED");
    });

    it("excludes COMMUNITY_DISCUSSION when discussion phase disabled", () => {
      const toggles: IdeaFeatureToggles = {
        ...allFeaturesEnabled,
        hasDiscussionPhase: false,
      };
      const transitions = getValidIdeaTransitions("QUALIFICATION", toggles, "DISCUSSION_VOTING");
      expect(transitions).not.toContain("COMMUNITY_DISCUSSION");
      expect(transitions).toContain("HOT");
      expect(transitions).toContain("ARCHIVED");
    });

    it("returns HOT, ARCHIVED from COMMUNITY_DISCUSSION", () => {
      const transitions = getValidIdeaTransitions(
        "COMMUNITY_DISCUSSION",
        allFeaturesEnabled,
        "DISCUSSION_VOTING",
      );
      expect(transitions).toContain("HOT");
      expect(transitions).toContain("ARCHIVED");
    });

    it("returns EVALUATION, ARCHIVED from HOT when campaign in EVALUATION", () => {
      const transitions = getValidIdeaTransitions("HOT", allFeaturesEnabled, "EVALUATION");
      expect(transitions).toContain("EVALUATION");
      expect(transitions).toContain("ARCHIVED");
    });

    it("excludes EVALUATION from HOT when campaign is in DISCUSSION_VOTING", () => {
      const transitions = getValidIdeaTransitions("HOT", allFeaturesEnabled, "DISCUSSION_VOTING");
      expect(transitions).not.toContain("EVALUATION");
      expect(transitions).toContain("ARCHIVED");
    });

    it("returns SELECTED_IMPLEMENTATION, ARCHIVED from EVALUATION", () => {
      const transitions = getValidIdeaTransitions("EVALUATION", allFeaturesEnabled, "EVALUATION");
      expect(transitions).toContain("SELECTED_IMPLEMENTATION");
      expect(transitions).toContain("ARCHIVED");
    });

    it("returns IMPLEMENTED, ARCHIVED from SELECTED_IMPLEMENTATION", () => {
      const transitions = getValidIdeaTransitions(
        "SELECTED_IMPLEMENTATION",
        allFeaturesEnabled,
        "CLOSED",
      );
      expect(transitions).toContain("IMPLEMENTED");
      expect(transitions).toContain("ARCHIVED");
    });

    it("returns ARCHIVED from IMPLEMENTED", () => {
      const transitions = getValidIdeaTransitions("IMPLEMENTED", allFeaturesEnabled, "CLOSED");
      expect(transitions).toEqual(["ARCHIVED"]);
    });

    it("returns empty array from ARCHIVED", () => {
      const transitions = getValidIdeaTransitions("ARCHIVED", allFeaturesEnabled, "CLOSED");
      expect(transitions).toEqual([]);
    });

    it("respects campaign phase ceiling — cannot advance ideas past campaign phase", () => {
      // Campaign in SEEDING — ideas can only be DRAFT or QUALIFICATION
      const transitions = getValidIdeaTransitions("QUALIFICATION", allFeaturesEnabled, "SEEDING");
      // COMMUNITY_DISCUSSION and HOT are not in the ceiling for SEEDING
      expect(transitions).not.toContain("COMMUNITY_DISCUSSION");
      expect(transitions).not.toContain("HOT");
      // ARCHIVED is always allowed
      expect(transitions).toContain("ARCHIVED");
    });
  });

  describe("isValidIdeaTransition", () => {
    it("allows QUALIFICATION -> COMMUNITY_DISCUSSION when discussion enabled", () => {
      expect(
        isValidIdeaTransition(
          "QUALIFICATION",
          "COMMUNITY_DISCUSSION",
          allFeaturesEnabled,
          "DISCUSSION_VOTING",
        ),
      ).toBe(true);
    });

    it("disallows backward transitions", () => {
      expect(isValidIdeaTransition("HOT", "QUALIFICATION", allFeaturesEnabled, "EVALUATION")).toBe(
        false,
      );
    });

    it("disallows DRAFT -> HOT (skipping phases)", () => {
      expect(isValidIdeaTransition("DRAFT", "HOT", allFeaturesEnabled, "EVALUATION")).toBe(false);
    });

    it("allows archival from any non-DRAFT, non-ARCHIVED state", () => {
      const states = [
        "QUALIFICATION",
        "COMMUNITY_DISCUSSION",
        "HOT",
        "EVALUATION",
        "SELECTED_IMPLEMENTATION",
        "IMPLEMENTED",
      ] as const;

      for (const status of states) {
        expect(isValidIdeaTransition(status, "ARCHIVED", allFeaturesEnabled, "CLOSED")).toBe(true);
      }
    });
  });

  describe("getIdeaTransitionGuards", () => {
    it("returns COACH_QUALIFIED for QUALIFICATION -> COMMUNITY_DISCUSSION", () => {
      const guards = getIdeaTransitionGuards("QUALIFICATION", "COMMUNITY_DISCUSSION");
      expect(guards).toEqual(["COACH_QUALIFIED"]);
    });

    it("returns COACH_QUALIFIED for QUALIFICATION -> HOT", () => {
      const guards = getIdeaTransitionGuards("QUALIFICATION", "HOT");
      expect(guards).toEqual(["COACH_QUALIFIED"]);
    });

    it("returns MEETS_GRADUATION_THRESHOLDS for COMMUNITY_DISCUSSION -> HOT", () => {
      const guards = getIdeaTransitionGuards("COMMUNITY_DISCUSSION", "HOT");
      expect(guards).toEqual(["MEETS_GRADUATION_THRESHOLDS"]);
    });

    it("returns CAMPAIGN_IN_EVALUATION_OR_LATER for HOT -> EVALUATION", () => {
      const guards = getIdeaTransitionGuards("HOT", "EVALUATION");
      expect(guards).toEqual(["CAMPAIGN_IN_EVALUATION_OR_LATER"]);
    });

    it("returns empty array for transitions without guards", () => {
      expect(getIdeaTransitionGuards("DRAFT", "QUALIFICATION")).toEqual([]);
      expect(getIdeaTransitionGuards("EVALUATION", "SELECTED_IMPLEMENTATION")).toEqual([]);
    });
  });

  describe("canUnarchive", () => {
    it("returns true for ARCHIVED status", () => {
      expect(canUnarchive("ARCHIVED")).toBe(true);
    });

    it("returns false for non-ARCHIVED statuses", () => {
      expect(canUnarchive("DRAFT")).toBe(false);
      expect(canUnarchive("QUALIFICATION")).toBe(false);
      expect(canUnarchive("HOT")).toBe(false);
    });
  });

  describe("IDEA_STATUS_LABELS", () => {
    it("has labels for all statuses", () => {
      expect(IDEA_STATUS_LABELS.DRAFT).toBe("Draft");
      expect(IDEA_STATUS_LABELS.QUALIFICATION).toBe("Qualification");
      expect(IDEA_STATUS_LABELS.COMMUNITY_DISCUSSION).toBe("Community Discussion");
      expect(IDEA_STATUS_LABELS.HOT).toBe("Hot");
      expect(IDEA_STATUS_LABELS.EVALUATION).toBe("Evaluation");
      expect(IDEA_STATUS_LABELS.SELECTED_IMPLEMENTATION).toBe("Selected for Implementation");
      expect(IDEA_STATUS_LABELS.IMPLEMENTED).toBe("Implemented");
      expect(IDEA_STATUS_LABELS.ARCHIVED).toBe("Archived");
    });
  });

  describe("IDEA_PHASE_ORDER", () => {
    it("contains all 8 phases in order", () => {
      expect(IDEA_PHASE_ORDER).toEqual([
        "DRAFT",
        "QUALIFICATION",
        "COMMUNITY_DISCUSSION",
        "HOT",
        "EVALUATION",
        "SELECTED_IMPLEMENTATION",
        "IMPLEMENTED",
        "ARCHIVED",
      ]);
    });
  });

  describe("IDEA_GUARD_FAILURE_MESSAGES", () => {
    it("has messages for all guard IDs", () => {
      expect(IDEA_GUARD_FAILURE_MESSAGES.COACH_QUALIFIED).toBeDefined();
      expect(IDEA_GUARD_FAILURE_MESSAGES.CAMPAIGN_IN_DISCUSSION_OR_LATER).toBeDefined();
      expect(IDEA_GUARD_FAILURE_MESSAGES.MEETS_GRADUATION_THRESHOLDS).toBeDefined();
      expect(IDEA_GUARD_FAILURE_MESSAGES.CAMPAIGN_IN_EVALUATION_OR_LATER).toBeDefined();
    });
  });

  describe("CAMPAIGN_SUBMITTABLE_STATUSES", () => {
    it("contains SEEDING and SUBMISSION", () => {
      expect(CAMPAIGN_SUBMITTABLE_STATUSES).toEqual(["SEEDING", "SUBMISSION"]);
    });
  });
});
