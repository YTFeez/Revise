import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { RacingProfile } from "@prisma/client";
import { prisma } from "../prisma.js";
import { optionalAuth, requireAuth } from "../auth.js";
import { RACING_QUESTS, RACING_TRACKS, RACING_VEHICLES, vehicleBySlug } from "../racing/catalog.js";

type QuestState = { claimed?: string[] };

function getClaimed(p: RacingProfile): Set<string> {
  const raw = (p.questState as QuestState)?.claimed;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((x): x is string => typeof x === "string"));
}

function racePayoutCredits(timeMs: number): number {
  return 40 + Math.min(380, Math.floor(220_000 / Math.max(timeMs, 45_000)));
}

const MIN_RACE_MS = 28_000;
const MAX_RACE_MS = 900_000;

async function getOrCreateProfile(userId: string): Promise<RacingProfile> {
  const existing = await prisma.racingProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.racingProfile.create({
    data: {
      userId,
      credits: 800,
      selectedVehicle: "bolt",
      ownedVehicles: ["bolt"],
      questState: {},
    },
  });
}

function evaluateNewQuests(after: RacingProfile, before: RacingProfile): { claimed: Set<string>; bonus: number } {
  const claimed = new Set(getClaimed(before));
  let bonus = 0;
  const owned = new Set(after.ownedVehicles);

  for (const q of RACING_QUESTS) {
    if (claimed.has(q.id)) continue;
    let ok = false;
    if (q.id === "first_finish") ok = after.racesCompleted >= 1;
    else if (q.id === "grind_800") ok = after.totalEarned >= 800;
    else if (q.id === "own_runner") ok = owned.has("runner");
    if (ok) {
      claimed.add(q.id);
      bonus += q.rewardCredits;
    }
  }
  return { claimed, bonus };
}

function mergeQuestState(profile: RacingProfile, claimed: Set<string>) {
  const prevQs =
    profile.questState && typeof profile.questState === "object" && !Array.isArray(profile.questState)
      ? (profile.questState as object)
      : {};
  return { ...prevQs, claimed: [...claimed] };
}

async function applyQuestBonusIfAny(profile: RacingProfile): Promise<RacingProfile> {
  const { claimed, bonus } = evaluateNewQuests(profile, profile);
  if (bonus <= 0) return profile;
  return prisma.racingProfile.update({
    where: { userId: profile.userId },
    data: {
      credits: profile.credits + bonus,
      questState: mergeQuestState(profile, claimed),
    },
  });
}

const FinishSchema = z.object({
  trackId: z.string().min(1).max(32),
  timeMs: z.number().int().min(MIN_RACE_MS).max(MAX_RACE_MS),
});

const SlugSchema = z.object({
  vehicleSlug: z.string().min(1).max(32),
});

export const racingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/catalog", async () => ({
    vehicles: RACING_VEHICLES,
    tracks: RACING_TRACKS,
    quests: RACING_QUESTS,
  }));

  app.get("/me", { preHandler: optionalAuth }, async (request) => {
    if (!request.userId) {
      return { authenticated: false as const };
    }
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { username: true },
    });
    const profileRaw = await getOrCreateProfile(request.userId);
    const profile = await applyQuestBonusIfAny(profileRaw);
    const claimed = getClaimed(profile);
    const quests = RACING_QUESTS.map((q) => ({
      ...q,
      done: claimed.has(q.id),
    }));
    return {
      authenticated: true as const,
      username: user?.username ?? "Joueur",
      credits: profile.credits,
      selectedVehicle: profile.selectedVehicle,
      ownedVehicles: profile.ownedVehicles,
      racesCompleted: profile.racesCompleted,
      totalEarned: profile.totalEarned,
      bestTimeMs: profile.bestTimeMs,
      quests,
    };
  });

  app.post("/equip", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = SlugSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const slug = parsed.data.vehicleSlug;
    if (!vehicleBySlug(slug)) return reply.code(400).send({ error: "Vehicule inconnu" });
    const profile = await getOrCreateProfile(request.userId!);
    if (!profile.ownedVehicles.includes(slug)) {
      return reply.code(403).send({ error: "Vehicule non possede" });
    }
    await prisma.racingProfile.update({
      where: { userId: request.userId! },
      data: { selectedVehicle: slug },
    });
    return { ok: true, selectedVehicle: slug };
  });

  app.post("/purchase", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = SlugSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
    const slug = parsed.data.vehicleSlug;
    const def = vehicleBySlug(slug);
    if (!def || def.price <= 0) return reply.code(400).send({ error: "Achat impossible" });
    const profile = await getOrCreateProfile(request.userId!);
    if (profile.ownedVehicles.includes(slug)) {
      return reply.code(409).send({ error: "Deja possede" });
    }
    if (profile.credits < def.price) {
      return reply.code(402).send({ error: "Credits insuffisants" });
    }
    let updated = await prisma.racingProfile.update({
      where: { userId: request.userId! },
      data: {
        credits: profile.credits - def.price,
        ownedVehicles: { push: slug },
      },
    });
    updated = await applyQuestBonusIfAny(updated);
    return { ok: true, credits: updated.credits, ownedVehicles: updated.ownedVehicles };
  });

  app.post("/race-finish", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = FinishSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Temps ou circuit invalides" });
    const { trackId, timeMs } = parsed.data;
    if (!RACING_TRACKS.some((t) => t.id === trackId)) {
      return reply.code(400).send({ error: "Circuit inconnu" });
    }

    const payout = racePayoutCredits(timeMs);
    const profile = await getOrCreateProfile(request.userId!);

    const newRaces = profile.racesCompleted + 1;
    const newTotalEarned = profile.totalEarned + payout;
    const newCredits = profile.credits + payout;
    const best =
      profile.bestTimeMs == null ? timeMs : Math.min(profile.bestTimeMs, timeMs);

    const after: RacingProfile = {
      ...profile,
      racesCompleted: newRaces,
      totalEarned: newTotalEarned,
      credits: newCredits,
      bestTimeMs: best,
    };
    const { claimed, bonus } = evaluateNewQuests(after, profile);
    const prevQs =
      profile.questState && typeof profile.questState === "object" && !Array.isArray(profile.questState)
        ? (profile.questState as object)
        : {};
    const questState = { ...prevQs, claimed: [...claimed] };

    await prisma.racingProfile.update({
      where: { userId: request.userId! },
      data: {
        credits: newCredits + bonus,
        racesCompleted: newRaces,
        totalEarned: newTotalEarned,
        bestTimeMs: best,
        questState,
      },
    });

    const finalCredits = newCredits + bonus;

    const questsOut = RACING_QUESTS.map((q) => ({
      id: q.id,
      done: claimed.has(q.id),
      title: q.title,
    }));

    return {
      ok: true,
      payout,
      questBonus: bonus,
      credits: finalCredits,
      racesCompleted: newRaces,
      bestTimeMs: best,
      quests: questsOut,
    };
  });
};
