import { Link } from "react-router-dom";

export interface SubjectProgressItem {
  subjectId: string;
  subjectSlug: string;
  subjectName: string;
  icon?: string | null;
  color?: string | null;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  progressPct: number;
  rankName: string;
  cardCount: number;
}

const colorClass: Record<string, string> = {
  emerald: "bar-emerald",
  rose: "bar-rose",
  amber: "bar-amber",
  violet: "bar-violet",
  sky: "bar-sky",
  lime: "bar-lime",
};

export function SubjectsGrid({ subjects }: { subjects: SubjectProgressItem[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Niveaux par matiere</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map((s) => (
          <Link
            key={s.subjectId}
            to={`/cours/${s.subjectSlug}`}
            className="card p-4 hover:border-brand-400/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{s.subjectName}</div>
                <div className="text-xs text-zinc-400 mt-0.5">Niveau {s.level} - {s.rankName}</div>
              </div>
              <span className="pill-violet">Niv. {s.level}</span>
            </div>
            <div className={`bar mt-3 ${colorClass[s.color || "violet"] || ""}`}>
              <span style={{ width: `${s.progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5">
              <span>{s.xpInLevel} / {s.xpForNext} XP</span>
              <span>{s.cardCount} fiches</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
