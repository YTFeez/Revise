import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../auth.js";
import { toPublicUser } from "../lib/publicUser.js";

const PurchaseSchema = z.object({ cosmeticSlug: z.string() });
const EquipSchema = z.object({ cosmeticSlug: z.string().nullable(), type: z.enum(["BORDER", "HAT", "BG"]) });

async function tryGetUserIdFromRequest(request: any): Promise<string | null> {
  try {
    const auth = request.headers?.authorization as string | undefined;
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice("Bearer ".length).trim();
      if (!token) return null;
      const decoded = (request.server as any).jwt.verify(token) as { sub: string };
      return decoded.sub ?? null;
    }
  } catch {
    // ignore
  }
  try {
    const token = request.cookies?.["rp_token"];
    if (!token) return null;
    const decoded = (request.server as any).jwt.verify(token) as { sub: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export const shopRoutes: FastifyPluginAsync = async (app) => {
  // tous les cosmetiques + indication "owned" pour l'utilisateur courant si connecte
  app.get("/cosmetics", async (request) => {
    const cosmetics = await prisma.cosmetic.findMany({ orderBy: [{ requiredLevel: "asc" }, { priceCoins: "asc" }] });
    let owned = new Set<string>();
    const userId = await tryGetUserIdFromRequest(request);
    if (userId) {
      const ucs = await prisma.userCosmetic.findMany({ where: { userId } });
      owned = new Set(ucs.map((u) => u.cosmeticId));
    }
    return cosmetics.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      type: c.type,
      description: c.description,
      priceCoins: c.priceCoins,
      requiredLevel: c.requiredLevel,
      borderClass: c.borderClass,
      rarity: c.rarity,
      owned: owned.has(c.id),
    }));
  });

  // historique d'achats
  app.get("/me/purchases", { preHandler: requireAuth }, async (request) => {
    const userId = request.userId!;
    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: { cosmetic: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return purchases.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      priceCoins: p.priceCoins,
      cosmetic: {
        slug: p.cosmetic.slug,
        name: p.cosmetic.name,
        type: p.cosmetic.type,
        rarity: p.cosmetic.rarity,
      },
    }));
  });

  // mes cosmetiques
  app.get("/me/cosmetics", { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.userId! },
      select: { equippedBorder: true, equippedHat: true, equippedBg: true },
    });
    const list = await prisma.userCosmetic.findMany({
      where: { userId: request.userId! },
      include: { cosmetic: true },
      orderBy: { acquiredAt: "asc" },
    });
    return list.map((uc) => ({
      id: uc.id,
      acquiredAt: uc.acquiredAt,
      equipped:
        (uc.cosmetic.type === "BORDER" && user.equippedBorder === uc.cosmetic.slug) ||
        (uc.cosmetic.type === "HAT" && user.equippedHat === uc.cosmetic.slug) ||
        (uc.cosmetic.type === "BG" && user.equippedBg === uc.cosmetic.slug) ||
        false,
      cosmetic: {
        id: uc.cosmetic.id,
        slug: uc.cosmetic.slug,
        name: uc.cosmetic.name,
        type: uc.cosmetic.type,
        borderClass: uc.cosmetic.borderClass,
        rarity: uc.cosmetic.rarity,
      },
    }));
  });

  // acheter
  app.post("/cosmetics/purchase", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = PurchaseSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const userId = request.userId!;
    const cosmetic = await prisma.cosmetic.findUnique({ where: { slug: parsed.data.cosmeticSlug } });
    if (!cosmetic) return reply.code(404).send({ error: "Cosmetique introuvable" });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.level < cosmetic.requiredLevel) {
      return reply.code(403).send({ error: `Niveau ${cosmetic.requiredLevel} requis` });
    }
    if (user.coins < cosmetic.priceCoins) {
      return reply.code(402).send({ error: "Pas assez de coins" });
    }
    const exists = await prisma.userCosmetic.findUnique({
      where: { userId_cosmeticId: { userId, cosmeticId: cosmetic.id } },
    });
    if (exists) return reply.code(409).send({ error: "Deja possede" });

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { coins: { decrement: cosmetic.priceCoins } } }),
      prisma.userCosmetic.create({ data: { userId, cosmeticId: cosmetic.id } }),
      prisma.purchase.create({ data: { userId, cosmeticId: cosmetic.id, priceCoins: cosmetic.priceCoins } }),
    ]);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return reply.send({ user: toPublicUser(updated), cosmeticSlug: cosmetic.slug });
  });

  // equiper / dequiper (slug = null pour retirer)
  app.post("/cosmetics/equip", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = EquipSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const userId = request.userId!;

    let slug: string | null = parsed.data.cosmeticSlug;
    if (slug !== null) {
      const cosmetic = await prisma.cosmetic.findUnique({ where: { slug } });
      if (!cosmetic) return reply.code(404).send({ error: "Cosmetique introuvable" });
      if (cosmetic.type !== parsed.data.type) return reply.code(400).send({ error: "Type incompatible" });
      const owned = await prisma.userCosmetic.findUnique({
        where: { userId_cosmeticId: { userId, cosmeticId: cosmetic.id } },
      });
      if (!owned) return reply.code(403).send({ error: "Cosmetique non possede" });
    }

    const data: any = {};
    if (parsed.data.type === "BORDER") data.equippedBorder = slug;
    if (parsed.data.type === "HAT") data.equippedHat = slug;
    if (parsed.data.type === "BG") data.equippedBg = slug;
    const user = await prisma.user.update({ where: { id: userId }, data });

    return reply.send({ user: toPublicUser(user) });
  });
};
