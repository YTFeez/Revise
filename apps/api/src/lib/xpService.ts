import { prisma } from "../prisma.js";
import { coinsForXp, levelFromTotalXp, rankForLevel } from "@revise-plus/shared";
import type { XpSource } from "@prisma/client";

export interface ApplyXpResult {
  xpGained: number;
  coinsGained: number;
  levelBefore: number;
  levelAfter: number;
  totalXp: number;
  rankName: string;
  newRankName?: string;
  leveledUp: boolean;
}

/**
 * Ajoute de l'XP a un utilisateur, recalcule son niveau, met a jour
 * son weeklyXp et lui donne des coins. Cree un XpEvent.
 */
export async function applyXp(
  userId: string,
  amount: number,
  source: XpSource,
  meta?: Record<string, unknown>,
): Promise<ApplyXpResult> {
  if (amount <= 0) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      xpGained: 0,
      coinsGained: 0,
      levelBefore: user.level,
      levelAfter: user.level,
      totalXp: user.totalXp,
      rankName: rankForLevel(user.level).name,
      leveledUp: false,
    };
  }

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const before = user.level;
    const newTotalXp = user.totalXp + amount;
    const { level: newLevel } = levelFromTotalXp(newTotalXp);
    const levelsGained = Math.max(0, newLevel - before);
    const coins = coinsForXp(amount, levelsGained);

    // reset weekly XP si la semaine a change (lundi minuit)
    const now = new Date();
    const weekStart = startOfWeek(now);
    const lastReset = user.weekResetAt;
    const newWeeklyXp = lastReset < weekStart ? amount : user.weeklyXp + amount;
    const newWeekResetAt = lastReset < weekStart ? weekStart : lastReset;

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        totalXp: newTotalXp,
        level: newLevel,
        coins: { increment: coins },
        weeklyXp: newWeeklyXp,
        weekResetAt: newWeekResetAt,
      },
    });

    await tx.xpEvent.create({
      data: { userId, source, amount, meta: (meta ?? {}) as any },
    });

    const before2 = rankForLevel(before);
    const after2 = rankForLevel(updated.level);
    const newRankName = before2.name !== after2.name ? after2.name : undefined;

    return {
      xpGained: amount,
      coinsGained: coins,
      levelBefore: before,
      levelAfter: updated.level,
      totalXp: updated.totalXp,
      rankName: after2.name,
      newRankName,
      leveledUp: levelsGained > 0,
    };
  });
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay() === 0 ? 6 : date.getDay() - 1; // lundi = 0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}
