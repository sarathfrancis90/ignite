import { EventEmitter } from "events";
import type { EventMap, EventName } from "@/types/events";

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(20);
  }

  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends EventName>(
    event: K,
    handler: (payload: EventMap[K]) => void,
  ): void {
    this.emitter.on(event, handler);
  }

  off<K extends EventName>(
    event: K,
    handler: (payload: EventMap[K]) => void,
  ): void {
    this.emitter.off(event, handler);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const eventBus = new TypedEventBus();
