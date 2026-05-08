import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../auth.js";
import { toPublicUser } from "../lib/publicUser.js";
import { auditLog } from "../lib/audit.js";

const BuySchema = z.object({ listingId: z.string() });

export const shopRotationRoutes: FastifyPluginAsync = async (app) => {
  // rotation active
  app.get("/shop/rotation", async () => {
    const now = new Date();
    const rotation = await prisma.shopRotation.findFirst({
      where: { startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { startsAt: "desc" },
      include: { listings: { include: { cosmetic: true }, orderBy: [{ featured: "desc" }, { priceCoins: "asc" }] } },
    });
    if (!rotation) return { rotation: null };
    return {
      rotation: {
        id: rotation.id,
        startsAt: rotation.startsAt,
        endsAt: rotation.endsAt,
        listings: rotation.listings.map((l) => ({
          id: l.id,
          priceCoins: l.priceCoins,
          featured: l.featured,
          stock: l.stock,
          sold: l.sold,
          cosmetic: {
            id: l.cosmetic.id,
            slug: l.cosmetic.slug,
            name: l.cosmetic.name,
            type: l.cosmetic.type,
            description: l.cosmetic.description,
            requiredLevel: l.cosmetic.requiredLevel,
            borderClass: l.cosmetic.borderClass,
            rarity: l.cosmetic.rarity,
          },
        })),
      },
    };
  });

  // acheter via listing (rotation)
  app.post("/shop/buy", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = BuySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const userId = request.userId!;

    const listing = await prisma.shopListing.findUnique({
      where: { id: parsed.data.listingId },
      include: { cosmetic: true, rotation: true },
    });
    if (!listing) return reply.code(404).send({ error: "Offre introuvable" });

    const now = new Date();
    if (!(listing.rotation.startsAt <= now && listing.rotation.endsAt > now)) {
      return reply.code(409).send({ error: "Rotation terminee" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.level < listing.cosmetic.requiredLevel) return reply.code(403).send({ error: "Niveau insuffisant" });
    if (user.coins < listing.priceCoins) return reply.code(402).send({ error: "Pas assez de coins" });

    const owned = await prisma.userCosmetic.findUnique({
      where: { userId_cosmeticId: { userId, cosmeticId: listing.cosmeticId } },
    });
    if (owned) return reply.code(409).send({ error: "Deja possede" });

    if (listing.stock !== null && listing.sold >= listing.stock) {
      return reply.code(409).send({ error: "Stock epuise" });
    }

    await prisma.$transaction(async (tx) => {
      // re-check stock atomiquement
      const fresh = await tx.shopListing.findUnique({ where: { id: listing.id } });
      if (!fresh) throw new Error("listing missing");
      if (fresh.stock !== null && fresh.sold >= fresh.stock) throw new Error("out_of_stock");

      await tx.shopListing.update({ where: { id: listing.id }, data: { sold: { increment: 1 } } });
      await tx.user.update({ where: { id: userId }, data: { coins: { decrement: listing.priceCoins } } });
      await tx.userCosmetic.create({ data: { userId, cosmeticId: listing.cosmeticId } });
      await tx.purchase.create({ data: { userId, cosmeticId: listing.cosmeticId, priceCoins: listing.priceCoins } });
    }).catch((e) => {
      if (String(e?.message).includes("out_of_stock")) {
        throw Object.assign(new Error("Stock epuise"), { statusCode: 409 });
      }
      throw e;
    });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await auditLog({ request, userId, action: "COSMETIC_PURCHASE", meta: { listingId: listing.id, cosmeticId: listing.cosmeticId } });
    return reply.send({ user: toPublicUser(updated) });
  });
};

