import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { LoginSchema, RegisterSchema } from "@revise-plus/shared";
import { prisma } from "../prisma.js";
import { COOKIE_NAME, clearAuthCookie, requireAuth, setAuthCookie } from "../auth.js";
import { toPublicUserWithCosmetics } from "../lib/publicUser.js";
import { auditLog } from "../lib/audit.js";
import { MAX_LEVEL, totalXpForLevel } from "@revise-plus/shared";

const gradeIn: Record<string, "SIXIEME" | "CINQUIEME" | "QUATRIEME" | "TROISIEME"> = {
  "6e": "SIXIEME",
  "5e": "CINQUIEME",
  "4e": "QUATRIEME",
  "3e": "TROISIEME",
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  async function ensureAdminPerks(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true, level: true, coins: true } });
    if (!user?.isAdmin) return;

    const targetLevel = MAX_LEVEL;
    const targetCoins = 999_999_999;
    if (user.level !== targetLevel || user.coins < targetCoins) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: targetLevel, totalXp: totalXpForLevel(targetLevel), coins: targetCoins },
      });
    }

    const cosmetics = await prisma.cosmetic.findMany({ select: { id: true } });
    if (cosmetics.length) {
      await prisma.userCosmetic.createMany({
        data: cosmetics.map((c) => ({ userId, cosmeticId: c.id })),
        skipDuplicates: true,
      });
    }
  }

  app.post("/auth/register", async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Donnees invalides", issues: parsed.error.issues });
    }
    const { email, username, password, gradeLevel } = parsed.data;
    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (exists) return reply.code(409).send({ error: "Email ou pseudo deja pris" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        gradeLevel: gradeLevel ? gradeIn[gradeLevel] : null,
        coins: 50, // bienvenue
      },
    });

    const token = app.jwt.sign({ sub: user.id, isAdmin: user.isAdmin });
    setAuthCookie(reply, token);
    await auditLog({ request, userId: user.id, action: "REGISTER", meta: { email: user.email } });
    await ensureAdminPerks(user.id);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return reply.send({ user: await toPublicUserWithCosmetics(updated), token });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: "Identifiants invalides" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "Identifiants invalides" });

    const token = app.jwt.sign({ sub: user.id, isAdmin: user.isAdmin });
    setAuthCookie(reply, token);
    await auditLog({ request, userId: user.id, action: "LOGIN" });
    await ensureAdminPerks(user.id);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return reply.send({ user: await toPublicUserWithCosmetics(updated), token });
  });

  app.post("/auth/logout", async (_req, reply) => {
    clearAuthCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.userId! } });
    if (!user) {
      clearAuthCookie(reply);
      return reply.code(401).send({ error: "Session invalide" });
    }
    await ensureAdminPerks(user.id);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return reply.send({ user: await toPublicUserWithCosmetics(updated) });
  });

  // helper interne pour debug : liste les cookies
  app.get("/auth/_debug-cookies", async (request) => ({ has: !!request.cookies[COOKIE_NAME] }));
};
