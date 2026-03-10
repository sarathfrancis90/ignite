import { z } from "zod";

// ── Custom Field Types ──────────────────────────────────────

export const FIELD_TYPES = [
  "text_single",
  "text_multi",
  "keyword",
  "selection",
  "checkbox",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text_single: "Single-line Text",
  text_multi: "Multi-line Text",
  keyword: "Keywords (Tags)",
  selection: "Dropdown Selection",
  checkbox: "Checkbox",
};

// ── Visibility Condition ────────────────────────────────────

export const visibilityConditionSchema = z.object({
  dependsOnFieldId: z.string(),
  operator: z.enum(["equals", "not_equals", "is_set", "is_not_set"]),
  value: z.string().optional(),
});

export type VisibilityCondition = z.infer<typeof visibilityConditionSchema>;

// ── Custom Field Schema ─────────────────────────────────────

export const customFieldSchema = z.object({
  id: z.string(),
  type: z.enum(FIELD_TYPES),
  label: z.string().min(1, "Label is required").max(200),
  helpText: z.string().max(500).optional(),
  mandatory: z.boolean().default(false),
  displayOrder: z.number().int().min(0),
  options: z.array(z.string().max(100)).optional(),
  visibilityCondition: visibilityConditionSchema.optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

export const customFieldsArraySchema = z.array(customFieldSchema);

// ── Wizard Step Definitions ─────────────────────────────────

export const WIZARD_STEPS = [
  { id: 1, label: "Description", key: "description" },
  { id: 2, label: "Submission Form", key: "submissionForm" },
  { id: 3, label: "Idea Coach", key: "ideaCoach" },
  { id: 4, label: "Community", key: "community" },
  { id: 5, label: "Settings", key: "settings" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

// ── Step 1 Description Form Data ────────────────────────────

export const stepDescriptionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  teaser: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  bannerUrl: z.string().url().max(2048).optional().nullable(),
  videoUrl: z
    .string()
    .max(2048)
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const url = new URL(val);
          return (
            url.hostname.includes("youtube.com") ||
            url.hostname.includes("youtu.be") ||
            url.hostname.includes("vimeo.com")
          );
        } catch {
          return false;
        }
      },
      { message: "Must be a YouTube or Vimeo URL" },
    ),
  submissionCloseDate: z.string().optional().nullable(),
  votingCloseDate: z.string().optional().nullable(),
  plannedCloseDate: z.string().optional().nullable(),
  callToAction: z.string().max(200).optional(),
  supportContent: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type StepDescriptionData = z.infer<typeof stepDescriptionSchema>;

// ── Step 2 Submission Form Data ─────────────────────────────

export const stepSubmissionFormSchema = z.object({
  customFields: customFieldsArraySchema,
});

export type StepSubmissionFormData = z.infer<typeof stepSubmissionFormSchema>;

// ── Idea Category Schema ──────────────────────────────────

export const ideaCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Category name is required").max(200),
  coachId: z.string().optional(),
});

export type IdeaCategory = z.infer<typeof ideaCategorySchema>;

// ── Step 3 Idea Coach Data ──────────────────────────────────

export const stepIdeaCoachSchema = z.object({
  hasIdeaCoach: z.boolean(),
  coachAssignmentMode: z.enum(["GLOBAL", "PER_CATEGORY"]),
  globalCoachId: z.string().optional(),
  categories: z.array(ideaCategorySchema),
});

export type StepIdeaCoachData = z.infer<typeof stepIdeaCoachSchema>;

// ── Step 4 Community Data ────────────────────────────────────

export const stepCommunitySchema = z.object({
  moderatorIds: z.array(z.string()),
  evaluatorIds: z.array(z.string()),
  seederIds: z.array(z.string()),
  audienceType: z.enum(["ALL_INTERNAL", "SELECTED_INTERNAL"]),
});

export type StepCommunityData = z.infer<typeof stepCommunitySchema>;

// ── Voting Criterion Schema ──────────────────────────────────

export const votingCriterionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required").max(200),
  weight: z.number().min(0).max(100),
});

export type VotingCriterion = z.infer<typeof votingCriterionSchema>;

// ── Step 5 Settings Data ─────────────────────────────────────

export const stepSettingsSchema = z.object({
  hasQualificationPhase: z.boolean(),
  hasVoting: z.boolean(),
  votingCriteria: z.array(votingCriterionSchema),
  graduationVisitors: z.number().int().min(0),
  graduationCommenters: z.number().int().min(0),
  graduationVoters: z.number().int().min(0),
  graduationVotingLevel: z.number().min(0),
  graduationDaysInStatus: z.number().int().min(0),
  isConfidentialAllowed: z.boolean(),
  isShowOnStartPage: z.boolean(),
});

export type StepSettingsData = z.infer<typeof stepSettingsSchema>;
