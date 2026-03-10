/**
 * Typed event bus for domain events.
 *
 * Provides a simple publish/subscribe mechanism for decoupling
 * state machine transitions from side effects (notifications,
 * activity logs, KPI updates, etc.).
 *
 * In production this will be backed by Redis PubSub + BullMQ
 * for durability. This in-process implementation is suitable
 * for unit tests and single-process deployments.
 */

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface IdeaStatusChangedEvent {
  ideaId: string;
  previousStatus: string;
  newStatus: string;
  actorId: string;
  campaignId: string | null;
  timestamp: Date;
  reason?: string;
}

export interface IdeaPublishedEvent {
  ideaId: string;
  campaignId: string | null;
  contributorId: string;
  actorId: string;
  timestamp: Date;
}

export interface IdeaArchivedEvent {
  ideaId: string;
  previousStatus: string;
  reason: string;
  actorId: string;
  timestamp: Date;
}

export interface IdeaUnarchivedEvent {
  ideaId: string;
  restoredStatus: string;
  actorId: string;
  timestamp: Date;
}

export interface CoachQualificationEvent {
  ideaId: string;
  coachId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
  feedback: string;
  timestamp: Date;
}

export interface EventMap {
  "idea.statusChanged": IdeaStatusChangedEvent;
  "idea.published": IdeaPublishedEvent;
  "idea.archived": IdeaArchivedEvent;
  "idea.unarchived": IdeaUnarchivedEvent;
  "idea.coachQualification": CoachQualificationEvent;
}

export type EventName = keyof EventMap;

class EventBusImpl {
  private handlers = new Map<string, Set<EventHandler<never>>>();

  on<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<never>);
  }

  off<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<never>);
  }

  async emit<E extends EventName>(
    event: E,
    payload: EventMap[E],
  ): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      const result = (handler as EventHandler<EventMap[E]>)(payload);
      if (result instanceof Promise) {
        promises.push(result);
      }
    }
    await Promise.all(promises);
  }

  removeAllListeners(event?: EventName): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  listenerCount(event: EventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

export const eventBus = new EventBusImpl();
export type EventBus = EventBusImpl;
