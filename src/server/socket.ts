import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { onCommentEvent } from "@/lib/socket-emitter";

let io: IOServer | null = null;

export function initSocketServer(httpServer: HTTPServer): IOServer {
  if (io) return io;

  io = new IOServer(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join:idea", (ideaId: string) => {
      socket.join(`idea:${ideaId}`);
    });

    socket.on("leave:idea", (ideaId: string) => {
      socket.leave(`idea:${ideaId}`);
    });
  });

  onCommentEvent((event) => {
    if (io) {
      io.to(`idea:${event.ideaId}`).emit(event.type, event);
    }
  });

  return io;
}

export function getIO(): IOServer | null {
  return io;
}
