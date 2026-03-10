import {
  compareMetric,
  getStatusColor,
  formatStatus,
  formatDate,
  getMetricHighlightClass,
  canEnterComparison,
} from "@/lib/comparison-utils";
import { createMockIdea } from "./fixtures";

describe("compareMetric", () => {
  it("returns higher/lower when a > b", () => {
    const result = compareMetric(4.2, 3.8);
    expect(result.left).toBe("higher");
    expect(result.right).toBe("lower");
  });

  it("returns lower/higher when a < b", () => {
    const result = compareMetric(3.0, 5.0);
    expect(result.left).toBe("lower");
    expect(result.right).toBe("higher");
  });

  it("returns equal/equal when a === b", () => {
    const result = compareMetric(4.0, 4.0);
    expect(result.left).toBe("equal");
    expect(result.right).toBe("equal");
  });

  it("handles null values", () => {
    expect(compareMetric(null, null)).toEqual({
      left: "equal",
      right: "equal",
    });
    expect(compareMetric(null, 3.0)).toEqual({
      left: "lower",
      right: "higher",
    });
    expect(compareMetric(3.0, null)).toEqual({
      left: "higher",
      right: "lower",
    });
  });
});

describe("getStatusColor", () => {
  it("returns correct class for HOT status", () => {
    expect(getStatusColor("HOT")).toContain("red");
  });

  it("returns correct class for DRAFT status", () => {
    expect(getStatusColor("DRAFT")).toContain("gray");
  });

  it("returns correct class for IMPLEMENTED status", () => {
    expect(getStatusColor("IMPLEMENTED")).toContain("green");
  });
});

describe("formatStatus", () => {
  it("replaces underscores with spaces", () => {
    expect(formatStatus("COMMUNITY_DISCUSSION")).toBe("COMMUNITY DISCUSSION");
    expect(formatStatus("SELECTED_CONCEPT")).toBe("SELECTED CONCEPT");
  });

  it("keeps single-word statuses unchanged", () => {
    expect(formatStatus("HOT")).toBe("HOT");
    expect(formatStatus("DRAFT")).toBe("DRAFT");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2026-01-15T10:00:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});

describe("getMetricHighlightClass", () => {
  it("returns green classes for higher", () => {
    expect(getMetricHighlightClass("higher")).toContain("green");
  });

  it("returns gray class for lower", () => {
    expect(getMetricHighlightClass("lower")).toContain("gray");
  });

  it("returns empty string for equal", () => {
    expect(getMetricHighlightClass("equal")).toBe("");
  });
});

describe("canEnterComparison", () => {
  it("returns true when exactly 2 ideas selected", () => {
    const ideas = [createMockIdea({ id: "1" }), createMockIdea({ id: "2" })];
    expect(canEnterComparison(ideas)).toBe(true);
  });

  it("returns false when 0 ideas selected", () => {
    expect(canEnterComparison([])).toBe(false);
  });

  it("returns false when 1 idea selected", () => {
    expect(canEnterComparison([createMockIdea()])).toBe(false);
  });

  it("returns false when 3 ideas selected", () => {
    const ideas = [
      createMockIdea({ id: "1" }),
      createMockIdea({ id: "2" }),
      createMockIdea({ id: "3" }),
    ];
    expect(canEnterComparison(ideas)).toBe(false);
  });
});
