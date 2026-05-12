import { Server as SocketIOServer } from "socket.io";
import type { FastifyInstance } from "fastify";
import { env } from "../env.js";
import { COOKIE_NAME } from "../auth.js";

let io: SocketIOServer | null = null;
const onlineUsers = new Map<string, number>(); // userId -> connections

function parseCookies(h?: string): Record<string, string> {
  if (!h) return {};
  const out: Record<string, string> = {};
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function attachSocket(app: FastifyInstance) {
  io = new SocketIOServer(app.server, {
    path: "/ws",
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  io.use(async (socket, next) => {
    (socket.data as { userId?: string | null }).userId = null;
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies[COOKIE_NAME];
      if (token) {
        const decoded = await app.jwt.verify<{ sub: string }>(token);
        (socket.data as { userId: string }).userId = decoded.sub;
      }
    } catch {
      (socket.data as { userId: null }).userId = null;
    }
    const nickRaw = (socket.handshake.auth as { nick?: string } | undefined)?.nick;
    let nick = typeof nickRaw === "string" && nickRaw.trim() ? nickRaw.trim().slice(0, 20) : "";
    if (!nick) nick = (socket.data as { userId?: string }).userId ? "Pilote" : "Invite";
    (socket.data as { nick: string }).nick = nick;
    next();
  });

  io.on("connection", (socket) => {
    socket.on("subscribe:leaderboard", () => socket.join("leaderboard"));
    socket.on("unsubscribe:leaderboard", () => socket.leave("leaderboard"));

    let lastStateAt = 0;
    socket.on("racing:join", (room?: unknown) => {
      const r =
        typeof room === "string" && room.length > 0 && room.length < 48 ? room.replace(/[^a-zA-Z0-9_-]/g, "") : "lobby";
      const roomKey = r || "lobby";
      socket.join(`racing:${roomKey}`);
      (socket.data as { racingRoom?: string }).racingRoom = roomKey;
      socket.to(`racing:${roomKey}`).emit("racing:peer-joined", {
        id: socket.id,
        nick: (socket.data as { nick: string }).nick,
      });
    });

    socket.on("racing:leave", () => {
      const r = (socket.data as { racingRoom?: string }).racingRoom;
      if (r) {
        socket.leave(`racing:${r}`);
        socket.to(`racing:${r}`).emit("racing:peer-left", { id: socket.id });
        delete (socket.data as { racingRoom?: string }).racingRoom;
      }
    });

    socket.on("racing:state", (payload: unknown) => {
      const now = Date.now();
      if (now - lastStateAt < 40) return;
      lastStateAt = now;
      const r = (socket.data as { racingRoom?: string }).racingRoom;
      if (!r || !payload || typeof payload !== "object") return;
      const p = payload as Record<string, unknown>;
      if (typeof p.u !== "number" || typeof p.lateral !== "number") return;
      socket.to(`racing:${r}`).emit("racing:peer-state", {
        id: socket.id,
        nick: (socket.data as { nick: string }).nick,
        u: Math.max(0, Math.min(1, p.u)),
        lateral: Math.max(-6, Math.min(6, p.lateral)),
        v: typeof p.v === "number" ? p.v : 0,
        vehicle: typeof p.vehicle === "string" ? p.vehicle.slice(0, 24) : "bolt",
      });
    });

    socket.on("presence:hello", (payload: { userId: string }) => {
      if (!payload?.userId) return;
      const prev = onlineUsers.get(payload.userId) ?? 0;
      onlineUsers.set(payload.userId, prev + 1);
      io?.emit("presence:update", { userId: payload.userId, online: true });
    });

    socket.on("disconnect", () => {
      const racingRoom = (socket.data as { racingRoom?: string }).racingRoom;
      if (racingRoom) socket.to(`racing:${racingRoom}`).emit("racing:peer-left", { id: socket.id });
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
