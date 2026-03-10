import { describe, it, expect } from "vitest";
import {
  customFieldSchema,
  customFieldsArraySchema,
  stepDescriptionSchema,
  stepSubmissionFormSchema,
  visibilityConditionSchema,
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  WIZARD_STEPS,
} from "./campaign-wizard";

describe("campaign-wizard types", () => {
  describe("FIELD_TYPES", () => {
    it("should have 5 field types", () => {
      expect(FIELD_TYPES).toHaveLength(5);
    });

    it("should have labels for all field types", () => {
      for (const type of FIELD_TYPES) {
        expect(FIELD_TYPE_LABELS[type]).toBeDefined();
        expect(typeof FIELD_TYPE_LABELS[type]).toBe("string");
      }
    });
  });

  describe("WIZARD_STEPS", () => {
    it("should have 5 steps", () => {
      expect(WIZARD_STEPS).toHaveLength(5);
    });

    it("should have sequential IDs", () => {
      WIZARD_STEPS.forEach((step, index) => {
        expect(step.id).toBe(index + 1);
      });
    });
  });

  describe("visibilityConditionSchema", () => {
    it("should accept valid condition with equals operator", () => {
      const result = visibilityConditionSchema.safeParse({
        dependsOnFieldId: "field_123",
        operator: "equals",
        value: "test",
      });
      expect(result.success).toBe(true);
    });

    it("should accept condition without value for is_set operator", () => {
      const result = visibilityConditionSchema.safeParse({
        dependsOnFieldId: "field_123",
        operator: "is_set",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid operator", () => {
      const result = visibilityConditionSchema.safeParse({
        dependsOnFieldId: "field_123",
        operator: "contains",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing dependsOnFieldId", () => {
      const result = visibilityConditionSchema.safeParse({
        operator: "equals",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("customFieldSchema", () => {
    it("should accept a valid text field", () => {
      const result = customFieldSchema.safeParse({
        id: "field_123",
        type: "text_single",
        label: "Project Name",
        helpText: "Enter the project name",
        mandatory: true,
        displayOrder: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should accept a selection field with options", () => {
      const result = customFieldSchema.safeParse({
        id: "field_456",
        type: "selection",
        label: "Priority",
        mandatory: false,
        displayOrder: 1,
        options: ["High", "Medium", "Low"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept a field with visibility condition", () => {
      const result = customFieldSchema.safeParse({
        id: "field_789",
        type: "text_multi",
        label: "Details",
        mandatory: false,
        displayOrder: 2,
        visibilityCondition: {
          dependsOnFieldId: "field_123",
          operator: "equals",
          value: "Yes",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing label", () => {
      const result = customFieldSchema.safeParse({
        id: "field_123",
        type: "text_single",
        label: "",
        mandatory: false,
        displayOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid field type", () => {
      const result = customFieldSchema.safeParse({
        id: "field_123",
        type: "radio",
        label: "Test",
        mandatory: false,
        displayOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject label over 200 chars", () => {
      const result = customFieldSchema.safeParse({
        id: "field_123",
        type: "text_single",
        label: "a".repeat(201),
        mandatory: false,
        displayOrder: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("customFieldsArraySchema", () => {
    it("should accept an empty array", () => {
      const result = customFieldsArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it("should accept multiple valid fields", () => {
      const result = customFieldsArraySchema.safeParse([
        {
          id: "f1",
          type: "text_single",
          label: "Name",
          mandatory: true,
          displayOrder: 0,
        },
        {
          id: "f2",
          type: "checkbox",
          label: "Agree to terms",
          mandatory: false,
          displayOrder: 1,
        },
      ]);
      expect(result.success).toBe(true);
    });

    it("should reject if any field is invalid", () => {
      const result = customFieldsArraySchema.safeParse([
        {
          id: "f1",
          type: "text_single",
          label: "Valid",
          mandatory: true,
          displayOrder: 0,
        },
        {
          id: "f2",
          type: "invalid_type",
          label: "Invalid",
          mandatory: false,
          displayOrder: 1,
        },
      ]);
      expect(result.success).toBe(false);
    });
  });

  describe("stepDescriptionSchema", () => {
    it("should accept valid description data", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "Innovation Challenge",
        teaser: "Join our challenge",
        description: "<p>Full description</p>",
      });
      expect(result.success).toBe(true);
    });

    it("should require title", () => {
      const result = stepDescriptionSchema.safeParse({
        teaser: "Join our challenge",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty title", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid YouTube video URL", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "Test",
        videoUrl: "https://www.youtube.com/watch?v=abc123",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid Vimeo video URL", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "Test",
        videoUrl: "https://vimeo.com/123456",
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-video URL", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "Test",
        videoUrl: "https://example.com/video",
      });
      expect(result.success).toBe(false);
    });

    it("should accept null videoUrl", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "Test",
        videoUrl: null,
      });
      expect(result.success).toBe(true);
    });

    it("should accept tags array", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "Test",
        tags: ["innovation", "tech", "design"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject more than 20 tags", () => {
      const result = stepDescriptionSchema.safeParse({
        title: "Test",
        tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("stepSubmissionFormSchema", () => {
    it("should accept valid submission form data", () => {
      const result = stepSubmissionFormSchema.safeParse({
        customFields: [
          {
            id: "f1",
            type: "text_single",
            label: "Name",
            mandatory: true,
            displayOrder: 0,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty custom fields", () => {
      const result = stepSubmissionFormSchema.safeParse({
        customFields: [],
      });
      expect(result.success).toBe(true);
    });
  });
});
