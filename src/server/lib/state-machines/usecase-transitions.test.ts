import { describe, it, expect } from "vitest";
import {
  getValidUseCaseTransitions,
  isValidUseCaseTransition,
  canArchiveUseCase,
  canUnarchiveUseCase,
  USE_CASE_PIPELINE_PHASES,
  USE_CASE_PHASE_ORDER,
  USE_CASE_STATUS_LABELS,
  STATUS_TIMESTAMP_FIELD,
} from "./usecase-transitions";

describe("usecase-transitions", () => {
  describe("getValidUseCaseTransitions", () => {
    it("returns QUALIFICATION as next from IDENTIFIED", () => {
      const transitions = getValidUseCaseTransitions("IDENTIFIED");
      expect(transitions).toEqual(["QUALIFICATION"]);
    });

    it("returns EVALUATION as next from QUALIFICATION", () => {
      const transitions = getValidUseCaseTransitions("QUALIFICATION");
      expect(transitions).toEqual(["EVALUATION"]);
    });

    it("returns PILOT as next from EVALUATION", () => {
      const transitions = getValidUseCaseTransitions("EVALUATION");
      expect(transitions).toEqual(["PILOT"]);
    });

    it("returns PARTNERSHIP as next from PILOT", () => {
      const transitions = getValidUseCaseTransitions("PILOT");
      expect(transitions).toEqual(["PARTNERSHIP"]);
    });

    it("returns empty array from PARTNERSHIP (terminal)", () => {
      const transitions = getValidUseCaseTransitions("PARTNERSHIP");
      expect(transitions).toEqual([]);
    });

    it("returns empty array from ARCHIVED (terminal)", () => {
      const transitions = getValidUseCaseTransitions("ARCHIVED");
      expect(transitions).toEqual([]);
    });
  });

  describe("isValidUseCaseTransition", () => {
    it("allows IDENTIFIED -> QUALIFICATION", () => {
      expect(isValidUseCaseTransition("IDENTIFIED", "QUALIFICATION")).toBe(true);
    });

    it("disallows IDENTIFIED -> EVALUATION (skip)", () => {
      expect(isValidUseCaseTransition("IDENTIFIED", "EVALUATION")).toBe(false);
    });

    it("disallows PARTNERSHIP -> IDENTIFIED (backward)", () => {
      expect(isValidUseCaseTransition("PARTNERSHIP", "IDENTIFIED")).toBe(false);
    });

    it("disallows ARCHIVED -> anything", () => {
      expect(isValidUseCaseTransition("ARCHIVED", "IDENTIFIED")).toBe(false);
      expect(isValidUseCaseTransition("ARCHIVED", "QUALIFICATION")).toBe(false);
    });
  });

  describe("canArchiveUseCase", () => {
    it("allows archiving from IDENTIFIED", () => {
      expect(canArchiveUseCase("IDENTIFIED")).toBe(true);
    });

    it("allows archiving from QUALIFICATION", () => {
      expect(canArchiveUseCase("QUALIFICATION")).toBe(true);
    });

    it("allows archiving from EVALUATION", () => {
      expect(canArchiveUseCase("EVALUATION")).toBe(true);
    });

    it("allows archiving from PILOT", () => {
      expect(canArchiveUseCase("PILOT")).toBe(true);
    });

    it("disallows archiving from PARTNERSHIP", () => {
      expect(canArchiveUseCase("PARTNERSHIP")).toBe(false);
    });

    it("disallows archiving from ARCHIVED", () => {
      expect(canArchiveUseCase("ARCHIVED")).toBe(false);
    });
  });

  describe("canUnarchiveUseCase", () => {
    it("allows unarchiving from ARCHIVED", () => {
      expect(canUnarchiveUseCase("ARCHIVED")).toBe(true);
    });

    it("disallows unarchiving from non-ARCHIVED", () => {
      expect(canUnarchiveUseCase("IDENTIFIED")).toBe(false);
      expect(canUnarchiveUseCase("PILOT")).toBe(false);
    });
  });

  describe("constants", () => {
    it("has 5 pipeline phases (no ARCHIVED)", () => {
      expect(USE_CASE_PIPELINE_PHASES).toHaveLength(5);
      expect(USE_CASE_PIPELINE_PHASES).not.toContain("ARCHIVED");
    });

    it("has 6 total phases including ARCHIVED", () => {
      expect(USE_CASE_PHASE_ORDER).toHaveLength(6);
      expect(USE_CASE_PHASE_ORDER).toContain("ARCHIVED");
    });

    it("has labels for all statuses", () => {
      expect(USE_CASE_STATUS_LABELS.IDENTIFIED).toBe("Identified");
      expect(USE_CASE_STATUS_LABELS.PARTNERSHIP).toBe("Partnership");
      expect(USE_CASE_STATUS_LABELS.ARCHIVED).toBe("Archived");
    });

    it("has timestamp fields for pipeline stages", () => {
      expect(STATUS_TIMESTAMP_FIELD.QUALIFICATION).toBe("qualifiedAt");
      expect(STATUS_TIMESTAMP_FIELD.PARTNERSHIP).toBe("partnershipAt");
      expect(STATUS_TIMESTAMP_FIELD.ARCHIVED).toBe("archivedAt");
    });
  });
});
