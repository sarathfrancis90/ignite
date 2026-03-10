import { eventBus } from "@/server/events/event-bus";
import { ActivityEventType } from "@/types/activity";
import type { ActivityDeps } from "@/server/services/activity.service";
import { logActivity } from "@/server/services/activity.service";
import type {
  CommentCreatedEvent,
  CommentFlaggedEvent,
  IdeaGraduatedEvent,
  IdeaPublishedEvent,
  IdeaStatusChangedEvent,
  IdeaSubmittedEvent,
  LikeAddedEvent,
  LikeRemovedEvent,
  VoteSubmittedEvent,
  EventPayload,
} from "@/types/events";

export function registerActivityLogger(
  deps: Pick<ActivityDeps, "createActivityLog">,
): void {
  eventBus.on("idea.submitted", (payload: IdeaSubmittedEvent) => {
    void logActivity(
      ActivityEventType.IDEA_SUBMITTED,
      payload.entity.id,
      payload.actor.id,
      { title: payload.entity.title },
      deps,
    );
  });

  eventBus.on("idea.statusChanged", (payload: IdeaStatusChangedEvent) => {
    void logActivity(
      ActivityEventType.IDEA_STATUS_CHANGED,
      payload.entity.id,
      payload.actor.id,
      {
        previousStatus: payload.previousStatus,
        newStatus: payload.newStatus,
      },
      deps,
    );
  });

  eventBus.on("idea.graduated", (payload: IdeaGraduatedEvent) => {
    void logActivity(
      ActivityEventType.IDEA_GRADUATED,
      payload.entity.id,
      payload.actor.id,
      {},
      deps,
    );
  });

  eventBus.on("idea.published", (payload: IdeaPublishedEvent) => {
    void logActivity(
      ActivityEventType.IDEA_PUBLISHED,
      payload.entity.id,
      payload.actor.id,
      {},
      deps,
    );
  });

  eventBus.on("idea.archived", (payload: EventPayload) => {
    void logActivity(
      ActivityEventType.IDEA_ARCHIVED,
      null,
      payload.actor.id,
      {},
      deps,
    );
  });

  eventBus.on("comment.created", (payload: CommentCreatedEvent) => {
    void logActivity(
      ActivityEventType.COMMENT_CREATED,
      payload.entity.ideaId,
      payload.actor.id,
      { commentId: payload.entity.id, isPrivate: payload.entity.isPrivate },
      deps,
    );
  });

  eventBus.on("comment.flagged", (payload: CommentFlaggedEvent) => {
    void logActivity(
      ActivityEventType.COMMENT_FLAGGED,
      null,
      payload.actor.id,
      { commentId: payload.entity.commentId },
      deps,
    );
  });

  eventBus.on("vote.submitted", (payload: VoteSubmittedEvent) => {
    void logActivity(
      ActivityEventType.VOTE_SUBMITTED,
      payload.entity.ideaId,
      payload.actor.id,
      { score: payload.entity.score },
      deps,
    );
  });

  eventBus.on("like.added", (payload: LikeAddedEvent) => {
    void logActivity(
      ActivityEventType.LIKE_ADDED,
      payload.entity.ideaId,
      payload.actor.id,
      {},
      deps,
    );
  });

  eventBus.on("like.removed", (payload: LikeRemovedEvent) => {
    void logActivity(
      ActivityEventType.LIKE_REMOVED,
      payload.entity.ideaId,
      payload.actor.id,
      {},
      deps,
    );
  });
}
