import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    isAdmin?: boolean;
  }
}

export const COOKIE_NAME = "rp_token";

function getBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m?.[1] ?? null;
}

export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30j
  });
}

export function clearAuthCookie(reply: FastifyReply) {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = getBearerToken(request) ?? request.cookies[COOKIE_NAME];
    if (!token) {
      return reply.code(401).send({ error: "Non authentifie" });
    }
    const decoded = (request.server as FastifyInstance).jwt.verify<{ sub: string; isAdmin?: boolean }>(token);
    request.userId = decoded.sub;
    request.isAdmin = !!decoded.isAdmin;
  } catch {
    return reply.code(401).send({ error: "Session invalide" });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  if (!request.isAdmin) {
    return reply.code(403).send({ error: "Reserve aux administrateurs" });
  }
}

export async function getCurrentUser(request: FastifyRequest) {
  if (!request.userId) return null;
  return prisma.user.findUnique({ where: { id: request.userId } });
}
