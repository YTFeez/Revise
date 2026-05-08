import { Server as SocketIOServer } from "socket.io";
import type { FastifyInstance } from "fastify";
import { env } from "../env.js";

let io: SocketIOServer | null = null;
const onlineUsers = new Map<string, number>(); // userId -> connections

export function attachSocket(app: FastifyInstance) {
  io = new SocketIOServer(app.server, {
    path: "/ws",
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("subscribe:leaderboard", () => socket.join("leaderboard"));
    socket.on("unsubscribe:leaderboard", () => socket.leave("leaderboard"));

    socket.on("presence:hello", (payload: { userId: string }) => {
      if (!payload?.userId) return;
      const prev = onlineUsers.get(payload.userId) ?? 0;
      onlineUsers.set(payload.userId, prev + 1);
      io?.emit("presence:update", { userId: payload.userId, online: true });
    });

    socket.on("disconnect", () => {
      // best-effort: client should send presence:bye, sinon on ne sait pas quel user.
    });
  });

  return io;
}

export function broadcastLevelUp(payload: { userId: string; level: number; rankName: string; newRankName?: string }) {
  io?.emit("user:levelup", payload);
}

export function broadcastLeaderboard() {
  io?.to("leaderboard").emit("leaderboard:dirty", { at: Date.now() });
}

export function presenceSnapshot() {
  return Array.from(onlineUsers.keys());
}
