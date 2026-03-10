import { z } from "zod";

const httpsUrl = z
  .string()
  .url("Must be a valid URL")
  .max(2048)
  .refine((url: string) => /^https?:\/\//i.test(url), "URL must use http or https protocol");

export const organizationListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  relationshipStatus: z
    .enum(["IDENTIFIED", "VERIFIED", "QUALIFIED", "EVALUATION", "PILOT", "PARTNERSHIP", "ARCHIVED"])
    .optional(),
  industry: z.string().max(100).optional(),
  isConfidential: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const organizationCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(5000, "Description must be 5000 characters or less").optional(),
  websiteUrl: httpsUrl.optional(),
  logoUrl: httpsUrl.optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  employeeCount: z.string().max(50).optional(),
  fundingStage: z.string().max(100).optional(),
  fundingTotal: z.string().max(100).optional(),
  relationshipStatus: z
    .enum(["IDENTIFIED", "VERIFIED", "QUALIFIED", "EVALUATION", "PILOT", "PARTNERSHIP", "ARCHIVED"])
    .default("IDENTIFIED"),
  ndaStatus: z.enum(["NONE", "REQUESTED", "SIGNED", "EXPIRED"]).default("NONE"),
  isConfidential: z.boolean().default(false),
  crunchbaseId: z.string().max(200).optional(),
  innospotId: z.string().max(200).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  managementTeam: z.record(z.string(), z.string()).optional(),
});

export const organizationUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  websiteUrl: httpsUrl.optional().nullable(),
  logoUrl: httpsUrl.optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  employeeCount: z.string().max(50).optional().nullable(),
  fundingStage: z.string().max(100).optional().nullable(),
  fundingTotal: z.string().max(100).optional().nullable(),
  relationshipStatus: z
    .enum(["IDENTIFIED", "VERIFIED", "QUALIFIED", "EVALUATION", "PILOT", "PARTNERSHIP", "ARCHIVED"])
    .optional(),
  ndaStatus: z.enum(["NONE", "REQUESTED", "SIGNED", "EXPIRED"]).optional(),
  isConfidential: z.boolean().optional(),
  crunchbaseId: z.string().max(200).optional().nullable(),
  innospotId: z.string().max(200).optional().nullable(),
  customFields: z.record(z.string(), z.string()).optional().nullable(),
  managementTeam: z.record(z.string(), z.string()).optional().nullable(),
});

export const organizationGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const organizationDeleteInput = z.object({
  id: z.string().cuid(),
});

export type OrganizationListInput = z.infer<typeof organizationListInput>;
export type OrganizationCreateInput = z.infer<typeof organizationCreateInput>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateInput>;
