import type { IdeaStatus as PrismaIdeaStatus } from "@prisma/client";

export type IdeaStatus = PrismaIdeaStatus;

export const IDEA_STATUS_VALUES: readonly IdeaStatus[] = [
  "DRAFT",
  "QUALIFICATION",
  "COMMUNITY_DISCUSSION",
  "HOT",
  "EVALUATION",
  "SELECTED_IMPLEMENTATION",
  "IMPLEMENTED",
  "ARCHIVED",
] as const;

export function isIdeaStatus(value: string): value is IdeaStatus {
  return (IDEA_STATUS_VALUES as readonly string[]).includes(value);
}
