import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../auth.js";
import { auditLog } from "../lib/audit.js";

const RequestSchema = z.object({ toUsername: z.string().min(2).max(24) });
const DecideSchema = z.object({ requestId: z.string(), accept: z.boolean() });
const RemoveSchema = z.object({ userId: z.string() });

export const friendsRoutes: FastifyPluginAsync = async (app) => {
  // Mes amis
  app.get("/friends", { preHandler: requireAuth }, async (request) => {
    const userId = request.userId!;
    const list = await prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: { userA: { select: { id: true, username: true, level: true } }, userB: { select: { id: true, username: true, level: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return list.map((f) => {
      const other = f.userAId === userId ? f.userB : f.userA;
      return { id: f.id, user: other, since: f.createdAt };
    });
  });

  // Demandes recues
  app.get("/friends/requests/in", { preHandler: requireAuth }, async (request) => {
    const userId = request.userId!;
    const reqs = await prisma.friendRequest.findMany({
      where: { toUserId: userId, status: "PENDING" },
      include: { fromUser: { select: { id: true, username: true, level: true } } },
      orderBy: { createdAt: "desc" },
    });
    return reqs.map((r) => ({ id: r.id, from: r.fromUser, createdAt: r.createdAt }));
  });

  // Demandes envoyees
  app.get("/friends/requests/out", { preHandler: requireAuth }, async (request) => {
    const userId = request.userId!;
    const reqs = await prisma.friendRequest.findMany({
      where: { fromUserId: userId, status: "PENDING" },
      include: { toUser: { select: { id: true, username: true, level: true } } },
      orderBy: { createdAt: "desc" },
    });
    return reqs.map((r) => ({ id: r.id, to: r.toUser, createdAt: r.createdAt }));
  });

  // Envoyer une demande
  app.post("/friends/request", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = RequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const userId = request.userId!;
    const to = await prisma.user.findUnique({ where: { username: parsed.data.toUsername } });
    if (!to) return reply.code(404).send({ error: "Utilisateur introuvable" });
    if (to.id === userId) return reply.code(400).send({ error: "Impossible de s'ajouter soi-meme" });

    await prisma.friendRequest.upsert({
      where: { fromUserId_toUserId: { fromUserId: userId, toUserId: to.id } },
      update: { status: "PENDING" },
      create: { fromUserId: userId, toUserId: to.id },
    });
    await auditLog({ request, userId, action: "FRIEND_REQUEST", meta: { toUserId: to.id } });
    return { ok: true };
  });

  // Accepter / refuser
  app.post("/friends/decide", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = DecideSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const userId = request.userId!;

    const fr = await prisma.friendRequest.findUnique({ where: { id: parsed.data.requestId } });
    if (!fr || fr.toUserId !== userId) return reply.code(404).send({ error: "Demande introuvable" });
    if (fr.status !== "PENDING") return reply.code(409).send({ error: "Deja traitee" });

    if (!parsed.data.accept) {
      await prisma.friendRequest.update({ where: { id: fr.id }, data: { status: "REJECTED" } });
      return { ok: true };
    }

    const [a, b] = fr.fromUserId < fr.toUserId ? [fr.fromUserId, fr.toUserId] : [fr.toUserId, fr.fromUserId];
    await prisma.$transaction([
      prisma.friendRequest.update({ where: { id: fr.id }, data: { status: "ACCEPTED" } }),
      prisma.friendship.upsert({
        where: { userAId_userBId: { userAId: a, userBId: b } },
        update: {},
        create: { userAId: a, userBId: b },
      }),
    ]);
    await auditLog({ request, userId, action: "FRIEND_ACCEPT", meta: { fromUserId: fr.fromUserId } });
    return { ok: true };
  });

  // Retirer un ami
  app.post("/friends/remove", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = RemoveSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const userId = request.userId!;
    const otherId = parsed.data.userId;
    const [a, b] = userId < otherId ? [userId, otherId] : [otherId, userId];
    await prisma.friendship.deleteMany({ where: { userAId: a, userBId: b } });
    await auditLog({ request, userId, action: "FRIEND_REMOVE", meta: { otherId } });
    return { ok: true };
  });
};

