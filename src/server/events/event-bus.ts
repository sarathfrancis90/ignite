import { EventEmitter } from "events";

export interface IdeaEvent {
  ideaId: string;
  actorId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface IdeaMergedEvent extends IdeaEvent {
  sourceIdeaIds: string[];
  newIdeaId: string;
}

export interface IdeaSplitEvent extends IdeaEvent {
  originalIdeaId: string;
  newIdeaIds: string[];
}

export interface IdeaBulkEvent {
  ideaIds: string[];
  actorId: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class EventBus extends EventEmitter {
  emitIdeaMerged(event: IdeaMergedEvent): void {
    this.emit("idea.merged", event);
  }

  emitIdeaSplit(event: IdeaSplitEvent): void {
    this.emit("idea.split", event);
  }

  emitIdeaBulkAction(event: IdeaBulkEvent): void {
    this.emit("idea.bulkAction", event);
  }

  emitIdeaArchived(event: IdeaEvent): void {
    this.emit("idea.archived", event);
  }

  emitIdeaBucketAssigned(event: IdeaEvent & { bucketId: string }): void {
    this.emit("idea.bucketAssigned", event);
  }
}

export const eventBus = new EventBus();
