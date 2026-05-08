import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../auth.js";
import { toPublicUser } from "../lib/publicUser.js";
import { auditLog } from "../lib/audit.js";

const AvatarSchema = z.object({
  base: z.enum(["sumo", "ninja", "mage", "robot", "alien"]).default("sumo"),
  skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me/avatar", { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    return { avatar: (user as any).avatarJson ?? null };
  });

  app.put("/me/avatar", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = AvatarSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Avatar invalide", issues: parsed.error.issues });

    const user = await prisma.user.update({
      where: { id: request.userId! },
      data: { avatarJson: parsed.data as any },
    });
    await auditLog({ request, userId: user.id, action: "ADMIN_ACTION", meta: { kind: "avatar_update" } });
    return { user: toPublicUser(user) };
  });
};

