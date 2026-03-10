import { EventEmitter } from "events";
import { type EventMap, type EventName } from "./types";
import { logger } from "@/server/lib/logger";

type EventHandler<T extends EventName> = (payload: EventMap[T]) => void;

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<T extends EventName>(event: T, handler: EventHandler<T>): void {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
  }

  off<T extends EventName>(event: T, handler: EventHandler<T>): void {
    this.emitter.off(event, handler as (...args: unknown[]) => void);
  }

  emit<T extends EventName>(event: T, payload: EventMap[T]): void {
    logger.info({ event, entityId: payload.entityId }, "EventBus emit");
    this.emitter.emit(event, payload);
  }

  listenerCount(event: EventName): number {
    return this.emitter.listenerCount(event);
  }

  removeAllListeners(event?: EventName): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

const globalForEventBus = globalThis as unknown as {
  eventBus: TypedEventBus | undefined;
};

export const eventBus = globalForEventBus.eventBus ?? new TypedEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.eventBus = eventBus;
}
