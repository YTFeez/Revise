import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Subject {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  color?: string;
  courseCount: number;
  gradeLevel: string;
}

const colorBg: Record<string, string> = {
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
  sky: "from-sky-500/20 to-sky-500/5 border-sky-500/30",
  lime: "from-lime-500/20 to-lime-500/5 border-lime-500/30",
};

export default function CoursesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    api<Subject[]>("/subjects").then(setSubjects).catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Cours</h1>
      <p className="text-sm text-zinc-400 mb-5">Choisis une matiere pour commencer a reviser.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {subjects.map((s) => (
          <Link
            key={s.id}
            to={`/cours/${s.slug}`}
            className={`rounded-2xl border bg-gradient-to-br p-5 hover:scale-[1.01] transition-transform ${colorBg[s.color || "violet"]}`}
          >
            <div className="text-lg font-semibold">{s.name}</div>
            <div className="text-xs text-zinc-400 mt-1">{s.courseCount} cours disponibles</div>
            <div className="text-[11px] text-zinc-500 mt-3">College</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
