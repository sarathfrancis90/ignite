import { eventBus } from "@/server/events/event-bus";
import type { GraduationDeps } from "@/server/services/graduation.service";
import { checkGraduation } from "@/server/services/graduation.service";
import type {
  CommentCreatedEvent,
  LikeAddedEvent,
  VoteSubmittedEvent,
} from "@/types/events";

export function registerGraduationChecker(deps: GraduationDeps): void {
  const handleCommentCreated = (payload: CommentCreatedEvent): void => {
    const ideaId = payload.entity.ideaId;
    void checkGraduation(ideaId, deps);
  };

  const handleVoteSubmitted = (payload: VoteSubmittedEvent): void => {
    const ideaId = payload.entity.ideaId;
    void checkGraduation(ideaId, deps);
  };

  const handleLikeAdded = (payload: LikeAddedEvent): void => {
    const ideaId = payload.entity.ideaId;
    void checkGraduation(ideaId, deps);
  };

  eventBus.on("comment.created", handleCommentCreated);
  eventBus.on("vote.submitted", handleVoteSubmitted);
  eventBus.on("like.added", handleLikeAdded);
}
