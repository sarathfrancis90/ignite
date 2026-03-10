import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const spaceListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const spaceCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be 50 characters or less")
    .regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens"),
  logoUrl: z.string().url().optional(),
});

export const spaceUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export const spaceGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const spaceArchiveInput = z.object({
  id: z.string().cuid(),
});

export const spaceActivateInput = z.object({
  id: z.string().cuid(),
});

export const spaceAddMemberInput = z.object({
  spaceId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.enum(["SPACE_ADMIN", "SPACE_MANAGER", "SPACE_MEMBER"]).default("SPACE_MEMBER"),
});

export const spaceRemoveMemberInput = z.object({
  spaceId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const spaceChangeMemberRoleInput = z.object({
  spaceId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.enum(["SPACE_ADMIN", "SPACE_MANAGER", "SPACE_MEMBER"]),
});

export const spaceAddMembersInput = z.object({
  spaceId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1).max(100),
  role: z.enum(["SPACE_ADMIN", "SPACE_MANAGER", "SPACE_MEMBER"]).default("SPACE_MEMBER"),
});

export type SpaceListInput = z.infer<typeof spaceListInput>;
export type SpaceCreateInput = z.infer<typeof spaceCreateInput>;
export type SpaceUpdateInput = z.infer<typeof spaceUpdateInput>;
