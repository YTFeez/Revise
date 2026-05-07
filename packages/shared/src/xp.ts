export const MAX_LEVEL = 1000;

/**
 * XP necessaire pour passer du niveau n au niveau n+1.
 * Courbe douce au debut, plus dure ensuite : floor(50 * n^1.5) avec un plancher de 50.
 */
export function xpForNextLevel(level: number): number {
  if (level < 1) return 50;
  if (level >= MAX_LEVEL) return Infinity;
  return Math.max(50, Math.floor(50 * Math.pow(level, 1.5)));
}

/**
 * XP cumulee pour atteindre un niveau donne (depuis le niveau 1).
 */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForNextLevel(i);
  }
  return total;
}

/**
 * A partir d'un total d'XP cumule, retourne le niveau et la progression
 * vers le niveau suivant.
 */
export function levelFromTotalXp(totalXp: number): {
  level: number;
  xpInLevel: number;
  xpForNext: number;
  progressPct: number;
} {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL) {
    const need = xpForNextLevel(level);
    if (remaining < need) break;
    remaining -= need;
    level += 1;
  }
  const xpForNext = level >= MAX_LEVEL ? 0 : xpForNextLevel(level);
  const progressPct = xpForNext === 0 ? 100 : Math.min(100, Math.floor((remaining / xpForNext) * 100));
  return { level, xpInLevel: remaining, xpForNext, progressPct };
}

/**
 * Calcule l'XP gagnee pour un quiz en fonction du score, de la difficulte
 * et du temps restant.
 */
export function xpForQuiz(opts: {
  scorePct: number; // 0..100
  difficulty?: number; // 1..3 par defaut 1
  isEval?: boolean; // mode evaluation = bonus
  timeBonusPct?: number; // 0..100 - % de temps restant
}): number {
  const score = Math.max(0, Math.min(100, opts.scorePct));
  const difficulty = opts.difficulty ?? 1;
  const timeBonus = 1 + ((opts.timeBonusPct ?? 0) / 100) * 0.25; // jusqu'a +25%
  const evalBonus = opts.isEval ? 1.5 : 1;
  const base = (score / 100) * 100; // 100 XP max sur quiz score parfait
  return Math.max(0, Math.floor(base * difficulty * timeBonus * evalBonus));
}

/**
 * Conversion XP -> Revise coins (30%) + bonus de level-up (10 par niveau gagne).
 */
export function coinsForXp(xpGained: number, levelsGained: number = 0): number {
  return Math.floor(xpGained * 0.3) + levelsGained * 10;
}
