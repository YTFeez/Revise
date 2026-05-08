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
  { name: "Recrue", levelMin: 1, levelMax: 50, borderStyle: "gray", description: "Niv. 1–50", borderClass: "rank-frame-svg rank-frame-recrue", textClass: "text-zinc-300", icon: "leaf" },
  { name: "Apprenti", levelMin: 51, levelMax: 150, borderStyle: "blue", description: "Niv. 51–150", borderClass: "rank-frame-svg rank-frame-apprenti", textClass: "text-sky-300", icon: "book" },
  { name: "Élève", levelMin: 151, levelMax: 300, borderStyle: "green-star", description: "Niv. 151–300", borderClass: "rank-frame-svg rank-frame-eleve", textClass: "text-emerald-300", icon: "star" },
  { name: "Curieux", levelMin: 301, levelMax: 450, borderStyle: "violet", description: "Niv. 301–450", borderClass: "rank-frame-svg rank-frame-curieux", textClass: "text-violet-300", icon: "lab" },
  { name: "Chercheur", levelMin: 451, levelMax: 550, borderStyle: "gold-crown", description: "Niv. 451–550", borderClass: "rank-frame-svg rank-frame-chercheur", textClass: "text-amber-300", icon: "crown" },
  { name: "Expert", levelMin: 551, levelMax: 700, borderStyle: "ruby", description: "Niv. 551–700", borderClass: "rank-frame-svg rank-frame-expert", textClass: "text-orange-300", icon: "gem" },
  { name: "Maître", levelMin: 701, levelMax: 800, borderStyle: "obsidian", description: "Niv. 701–800", borderClass: "rank-frame-svg rank-frame-maitre", textClass: "text-indigo-200", icon: "scroll" },
  { name: "Savant", levelMin: 801, levelMax: 900, borderStyle: "celestial", description: "Niv. 801–900", borderClass: "rank-frame-svg rank-frame-savant", textClass: "text-emerald-200", icon: "galaxy" },
  { name: "Génie", levelMin: 901, levelMax: 999, borderStyle: "diamond", description: "Niv. 901–999", borderClass: "rank-frame-svg rank-frame-genie", textClass: "text-amber-200", icon: "trophy" },
  { name: "Légendaire", levelMin: 1000, levelMax: 1000, borderStyle: "rainbow", description: "Niv. 1000", borderClass: "rank-frame-svg rank-frame-legendaire", textClass: "text-rose-200", icon: "trophy" },
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
