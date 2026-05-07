import { Server as SocketIOServer } from "socket.io";
import type { FastifyInstance } from "fastify";
import { env } from "../env.js";

let io: SocketIOServer | null = null;

export function attachSocket(app: FastifyInstance) {
  io = new SocketIOServer(app.server, {
    path: "/ws",
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("subscribe:leaderboard", () => socket.join("leaderboard"));
    socket.on("unsubscribe:leaderboard", () => socket.leave("leaderboard"));
  });

  return io;
}

export function broadcastLevelUp(payload: { userId: string; level: number; rankName: string; newRankName?: string }) {
  io?.emit("user:levelup", payload);
}

export function broadcastLeaderboard() {
  io?.to("leaderboard").emit("leaderboard:dirty", { at: Date.now() });
}
