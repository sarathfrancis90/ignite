import { describe, it, expect } from "vitest";
import {
  splitIdeaInputSchema,
  mergeIdeasInputSchema,
  bulkAssignBucketInputSchema,
  bulkArchiveInputSchema,
  bulkExportInputSchema,
} from "./idea";

describe("Input Schemas", () => {
  describe("splitIdeaInputSchema", () => {
    it("should accept valid split input", () => {
      const result = splitIdeaInputSchema.safeParse({
        ideaId: "idea-1",
        splits: [
          { title: "Split A", description: "Desc A" },
          { title: "Split B" },
        ],
        archiveOriginal: true,
      });
      expect(result.success).toBe(true);
    });

    it("should reject fewer than 2 splits", () => {
      const result = splitIdeaInputSchema.safeParse({
        ideaId: "idea-1",
        splits: [{ title: "Only one" }],
        archiveOriginal: true,
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty ideaId", () => {
      const result = splitIdeaInputSchema.safeParse({
        ideaId: "",
        splits: [{ title: "A" }, { title: "B" }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty split titles", () => {
      const result = splitIdeaInputSchema.safeParse({
        ideaId: "idea-1",
        splits: [{ title: "" }, { title: "B" }],
      });
      expect(result.success).toBe(false);
    });

    it("should default archiveOriginal to true", () => {
      const result = splitIdeaInputSchema.safeParse({
        ideaId: "idea-1",
        splits: [{ title: "A" }, { title: "B" }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.archiveOriginal).toBe(true);
      }
    });
  });

  describe("mergeIdeasInputSchema", () => {
    it("should accept valid merge input", () => {
      const result = mergeIdeasInputSchema.safeParse({
        ideaIds: ["idea-1", "idea-2"],
        campaignId: "campaign-1",
        title: "Merged idea",
      });
      expect(result.success).toBe(true);
    });

    it("should reject fewer than 2 idea IDs", () => {
      const result = mergeIdeasInputSchema.safeParse({
        ideaIds: ["idea-1"],
        campaignId: "campaign-1",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty campaignId", () => {
      const result = mergeIdeasInputSchema.safeParse({
        ideaIds: ["idea-1", "idea-2"],
        campaignId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should allow optional title and description", () => {
      const result = mergeIdeasInputSchema.safeParse({
        ideaIds: ["idea-1", "idea-2"],
        campaignId: "campaign-1",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("bulkAssignBucketInputSchema", () => {
    it("should accept valid input", () => {
      const result = bulkAssignBucketInputSchema.safeParse({
        ideaIds: ["idea-1", "idea-2"],
        bucketId: "bucket-1",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty ideaIds array", () => {
      const result = bulkAssignBucketInputSchema.safeParse({
        ideaIds: [],
        bucketId: "bucket-1",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bulkArchiveInputSchema", () => {
    it("should accept valid input with optional reason", () => {
      const result = bulkArchiveInputSchema.safeParse({
        ideaIds: ["idea-1"],
        reason: "No longer relevant",
      });
      expect(result.success).toBe(true);
    });

    it("should accept input without reason", () => {
      const result = bulkArchiveInputSchema.safeParse({
        ideaIds: ["idea-1"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("bulkExportInputSchema", () => {
    it("should accept json format", () => {
      const result = bulkExportInputSchema.safeParse({
        ideaIds: ["idea-1"],
        format: "json",
      });
      expect(result.success).toBe(true);
    });

    it("should accept csv format", () => {
      const result = bulkExportInputSchema.safeParse({
        ideaIds: ["idea-1"],
        format: "csv",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid format", () => {
      const result = bulkExportInputSchema.safeParse({
        ideaIds: ["idea-1"],
        format: "xml",
      });
      expect(result.success).toBe(false);
    });

    it("should default to json format", () => {
      const result = bulkExportInputSchema.safeParse({
        ideaIds: ["idea-1"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("json");
      }
    });
  });
});
