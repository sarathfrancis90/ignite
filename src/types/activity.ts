export const ActivityEventType = {
  IDEA_SUBMITTED: "IDEA_SUBMITTED",
  IDEA_STATUS_CHANGED: "IDEA_STATUS_CHANGED",
  IDEA_GRADUATED: "IDEA_GRADUATED",
  IDEA_PUBLISHED: "IDEA_PUBLISHED",
  IDEA_ARCHIVED: "IDEA_ARCHIVED",
  IDEA_UNARCHIVED: "IDEA_UNARCHIVED",
  COMMENT_CREATED: "COMMENT_CREATED",
  COMMENT_FLAGGED: "COMMENT_FLAGGED",
  VOTE_SUBMITTED: "VOTE_SUBMITTED",
  LIKE_ADDED: "LIKE_ADDED",
  LIKE_REMOVED: "LIKE_REMOVED",
  FOLLOW_ADDED: "FOLLOW_ADDED",
  USER_MENTIONED: "USER_MENTIONED",
  COAUTHOR_ADDED: "COAUTHOR_ADDED",
  EVALUATION_STARTED: "EVALUATION_STARTED",
} as const;

export type ActivityEventType =
  (typeof ActivityEventType)[keyof typeof ActivityEventType];

export interface ActivityLogEntry {
  id: string;
  eventType: ActivityEventType;
  ideaId: string | null;
  actorId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    displayName: string | null;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface ActivityFeedResponse {
  items: ActivityLogEntry[];
  nextCursor: string | undefined;
}
