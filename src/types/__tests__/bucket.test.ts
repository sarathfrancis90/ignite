import { describe, it, expect } from "vitest";
import {
  createBucketSchema,
  createSmartBucketSchema,
  updateBucketSchema,
  smartFilterSchema,
  assignIdeaToBucketSchema,
  bulkAssignBucketSchema,
} from "@/types/bucket";

// ============================================================
// Zod Schema Validation Tests
// ============================================================

describe("createBucketSchema", () => {
  it("should accept valid input", () => {
    const result = createBucketSchema.safeParse({
      campaignId: "c1",
      name: "To Review",
      color: "#EF4444",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = createBucketSchema.safeParse({
      campaignId: "c1",
      name: "",
      color: "#EF4444",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name over 50 chars", () => {
    const result = createBucketSchema.safeParse({
      campaignId: "c1",
      name: "a".repeat(51),
      color: "#EF4444",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid hex color", () => {
    const result = createBucketSchema.safeParse({
      campaignId: "c1",
      name: "Test",
      color: "red",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing campaignId", () => {
    const result = createBucketSchema.safeParse({
      name: "Test",
      color: "#EF4444",
    });
    expect(result.success).toBe(false);
  });
});

describe("createSmartBucketSchema", () => {
  it("should accept valid smart bucket input", () => {
    const result = createSmartBucketSchema.safeParse({
      campaignId: "c1",
      name: "Hot Ideas",
      color: "#F59E0B",
      filter: {
        status: ["HOT"],
        minVoteScore: 5,
        isHot: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty filter object", () => {
    const result = createSmartBucketSchema.safeParse({
      campaignId: "c1",
      name: "All",
      color: "#6366F1",
      filter: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("smartFilterSchema", () => {
  it("should accept all filter fields", () => {
    const result = smartFilterSchema.safeParse({
      status: ["HOT", "EVALUATION"],
      categoryId: "cat1",
      minVoteScore: 3.5,
      maxVoteScore: 10,
      minLikeCount: 5,
      minCommentCount: 2,
      isHot: true,
      tags: ["innovation"],
      dateRange: {
        from: "2026-01-01",
        to: "2026-12-31",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty filter", () => {
    const result = smartFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should accept partial date range", () => {
    const result = smartFilterSchema.safeParse({
      dateRange: { from: "2026-01-01" },
    });
    expect(result.success).toBe(true);
  });
});

describe("updateBucketSchema", () => {
  it("should accept partial updates", () => {
    const result = updateBucketSchema.safeParse({
      bucketId: "b1",
      name: "New Name",
    });
    expect(result.success).toBe(true);
  });

  it("should accept color-only update", () => {
    const result = updateBucketSchema.safeParse({
      bucketId: "b1",
      color: "#10B981",
    });
    expect(result.success).toBe(true);
  });

  it("should reject without bucketId", () => {
    const result = updateBucketSchema.safeParse({
      name: "New Name",
    });
    expect(result.success).toBe(false);
  });
});

describe("assignIdeaToBucketSchema", () => {
  it("should accept valid input", () => {
    const result = assignIdeaToBucketSchema.safeParse({
      ideaId: "i1",
      bucketId: "b1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty ideaId", () => {
    const result = assignIdeaToBucketSchema.safeParse({
      ideaId: "",
      bucketId: "b1",
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkAssignBucketSchema", () => {
  it("should accept array of idea ids", () => {
    const result = bulkAssignBucketSchema.safeParse({
      ideaIds: ["i1", "i2", "i3"],
      bucketId: "b1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty ideaIds array", () => {
    const result = bulkAssignBucketSchema.safeParse({
      ideaIds: [],
      bucketId: "b1",
    });
    expect(result.success).toBe(false);
  });
});
