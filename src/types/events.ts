export interface EventPayload {
  actor: { id: string; displayName: string };
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IdeaSubmittedEvent extends EventPayload {
  entity: { id: string; title: string; campaignId: string | null };
}

export interface IdeaStatusChangedEvent extends EventPayload {
  entity: { id: string; title: string };
  previousStatus: string;
  newStatus: string;
}

export interface IdeaGraduatedEvent extends EventPayload {
  entity: { id: string; title: string; campaignId: string | null };
}

export interface IdeaPublishedEvent extends EventPayload {
  entity: { id: string; title: string };
}

export interface CommentCreatedEvent extends EventPayload {
  entity: { id: string; ideaId: string; isPrivate: boolean };
}

export interface CommentFlaggedEvent extends EventPayload {
  entity: { id: string; commentId: string };
}

export interface VoteSubmittedEvent extends EventPayload {
  entity: { ideaId: string; criterionId: string | null; score: number };
}

export interface LikeAddedEvent extends EventPayload {
  entity: { ideaId: string };
}

export interface LikeRemovedEvent extends EventPayload {
  entity: { ideaId: string };
}

export interface FollowAddedEvent extends EventPayload {
  entity: { entityType: string; entityId: string };
}

export interface UserMentionedEvent extends EventPayload {
  entity: { commentId: string; mentionedUserId: string; ideaId: string };
}

export type EventName =
  | "idea.submitted"
  | "idea.statusChanged"
  | "idea.graduated"
  | "idea.published"
  | "idea.archived"
  | "idea.unarchived"
  | "comment.created"
  | "comment.flagged"
  | "vote.submitted"
  | "like.added"
  | "like.removed"
  | "follow.added"
  | "user.mentioned"
  | "coauthor.added"
  | "evaluation.started";

export type EventMap = {
  "idea.submitted": IdeaSubmittedEvent;
  "idea.statusChanged": IdeaStatusChangedEvent;
  "idea.graduated": IdeaGraduatedEvent;
  "idea.published": IdeaPublishedEvent;
  "idea.archived": EventPayload;
  "idea.unarchived": EventPayload;
  "comment.created": CommentCreatedEvent;
  "comment.flagged": CommentFlaggedEvent;
  "vote.submitted": VoteSubmittedEvent;
  "like.added": LikeAddedEvent;
  "like.removed": LikeRemovedEvent;
  "follow.added": FollowAddedEvent;
  "user.mentioned": UserMentionedEvent;
  "coauthor.added": EventPayload;
  "evaluation.started": EventPayload;
};
