export type RankBorderStyle =
  | "gray"
  | "blue"
  | "violet"
  | "green-star"
  | "gold-crown"
  | "diamond"
  | "ruby"
  | "obsidian"
  | "celestial"
  | "rainbow";

export interface Rank {
  name: string;
  levelMin: number;
  levelMax: number;
  borderStyle: RankBorderStyle;
  description: string;
  /** classes Tailwind pour la bordure d'avatar */
  borderClass: string;
  /** classe pour le texte (couleur du nom) */
  textClass: string;
  /** badge / icone */
  icon: string;
}

/**
 * Grades du jeu (1 -> 1000). Les premiers grades correspondent a la maquette,
 * les suivants etendent la progression jusqu'au niveau max.
 */
export const RANKS: Rank[] = [
  { name: "Debutant", levelMin: 1, levelMax: 5, borderStyle: "gray", description: "Cadre gris", borderClass: "ring-2 ring-zinc-500", textClass: "text-zinc-300", icon: "leaf" },
  { name: "Curieux", levelMin: 6, levelMax: 15, borderStyle: "blue", description: "Cadre bleu", borderClass: "ring-2 ring-sky-400", textClass: "text-sky-300", icon: "book" },
  { name: "Chercheur", levelMin: 16, levelMax: 30, borderStyle: "violet", description: "Cadre violet", borderClass: "ring-2 ring-violet-400", textClass: "text-violet-300", icon: "lab" },
  { name: "Savant", levelMin: 31, levelMax: 60, borderStyle: "green-star", description: "Cadre vert + etoile", borderClass: "ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]", textClass: "text-emerald-300", icon: "star" },
  { name: "Genie", levelMin: 61, levelMax: 120, borderStyle: "gold-crown", description: "Cadre or + couronne", borderClass: "ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.7)]", textClass: "text-amber-300", icon: "crown" },
  { name: "Erudit", levelMin: 121, levelMax: 220, borderStyle: "diamond", description: "Cadre diamant", borderClass: "ring-2 ring-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.7)]", textClass: "text-cyan-200", icon: "diamond" },
  { name: "Sage", levelMin: 221, levelMax: 360, borderStyle: "ruby", description: "Cadre rubis", borderClass: "ring-2 ring-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.7)]", textClass: "text-rose-300", icon: "gem" },
  { name: "Maitre", levelMin: 361, levelMax: 540, borderStyle: "obsidian", description: "Cadre obsidienne", borderClass: "ring-2 ring-fuchsia-500 shadow-[0_0_22px_rgba(217,70,239,0.7)]", textClass: "text-fuchsia-300", icon: "scroll" },
  { name: "Cosmique", levelMin: 541, levelMax: 800, borderStyle: "celestial", description: "Cadre celeste etoile", borderClass: "ring-2 ring-indigo-400 shadow-[0_0_28px_rgba(129,140,248,0.8)]", textClass: "text-indigo-200", icon: "galaxy" },
  { name: "Legende", levelMin: 801, levelMax: 1000, borderStyle: "rainbow", description: "Cadre arc-en-ciel anime", borderClass: "rank-rainbow", textClass: "rank-text-rainbow", icon: "trophy" },
];

export function rankForLevel(level: number): Rank {
  const clamped = Math.max(1, Math.min(level, 1000));
  return RANKS.find((r) => clamped >= r.levelMin && clamped <= r.levelMax) ?? RANKS[0];
}

export function nextRank(level: number): Rank | null {
  const current = rankForLevel(level);
  const idx = RANKS.indexOf(current);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}
