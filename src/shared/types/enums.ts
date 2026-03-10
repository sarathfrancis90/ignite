/**
 * Idea lifecycle status values.
 * Mirrors the Prisma IdeaStatus enum from the database schema.
 */
export enum IdeaStatus {
  DRAFT = "DRAFT",
  QUALIFICATION = "QUALIFICATION",
  COMMUNITY_DISCUSSION = "COMMUNITY_DISCUSSION",
  HOT = "HOT",
  EVALUATION = "EVALUATION",
  SELECTED_CONCEPT = "SELECTED_CONCEPT",
  SELECTED_IMPLEMENTATION = "SELECTED_IMPLEMENTATION",
  IMPLEMENTED = "IMPLEMENTED",
  IMPLEMENTATION_CANCELED = "IMPLEMENTATION_CANCELED",
  ARCHIVED = "ARCHIVED",
}

/**
 * Campaign lifecycle status values.
 * Mirrors the Prisma CampaignStatus enum from the database schema.
 */
export enum CampaignStatus {
  DRAFT = "DRAFT",
  SEEDING = "SEEDING",
  SUBMISSION = "SUBMISSION",
  DISCUSSION_VOTING = "DISCUSSION_VOTING",
  EVALUATION = "EVALUATION",
  CLOSED = "CLOSED",
}

/**
 * Campaign member roles.
 */
export enum CampaignRole {
  MANAGER = "MANAGER",
  SPONSOR = "SPONSOR",
  MODERATOR = "MODERATOR",
  EVALUATOR = "EVALUATOR",
  SEEDING_TEAM = "SEEDING_TEAM",
  IDEA_COACH = "IDEA_COACH",
}
