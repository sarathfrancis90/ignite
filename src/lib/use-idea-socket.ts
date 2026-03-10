"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { CommentEvent } from "@/types/comment";

export function useIdeaSocket(
  ideaId: string,
  onEvent: (event: CommentEvent) => void,
): void {
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:idea", ideaId);
    });

    const eventTypes = [
      "comment:added",
      "comment:updated",
      "comment:deleted",
      "comment:flagged",
    ] as const;

    for (const eventType of eventTypes) {
      socket.on(eventType, (event: CommentEvent) => {
        onEventRef.current(event);
      });
    }

    return () => {
      socket.emit("leave:idea", ideaId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [ideaId]);
}
