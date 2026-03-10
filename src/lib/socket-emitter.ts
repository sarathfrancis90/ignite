import type { CommentEvent } from "@/types/comment";

type EventHandler = (event: CommentEvent) => void;

const handlers: EventHandler[] = [];

export function onCommentEvent(handler: EventHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  };
}

export function emitCommentEvent(event: CommentEvent): void {
  for (const handler of handlers) {
    handler(event);
  }
}
