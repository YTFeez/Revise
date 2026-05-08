import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "../prisma.js";
import type { AuditAction } from "@prisma/client";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function auditLog(opts: {
  request: FastifyRequest;
  userId?: string | null;
  action: AuditAction;
  meta?: Record<string, unknown>;
}) {
  const ip = opts.request.ip || "";
  const ua = String(opts.request.headers["user-agent"] || "");
  const ipHash = ip ? sha256Hex(ip) : null;
  const userAgent = ua?.slice(0, 300) || null;
  await prisma.auditLog.create({
    data: {
      userId: opts.userId ?? null,
      action: opts.action,
      ipHash,
      userAgent,
      meta: (opts.meta ?? {}) as any,
    },
  });
}

