import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface QuizItem {
  id: string;
  title: string;
  type: "QUIZ" | "EVAL";
  difficulty: number;
  timeLimitSec: number;
  questionCount: number;
  course: { id: string; slug: string; title: string; subject: { id: string; slug: string; name: string } };
}

export default function QuizListPage({ type }: { type: "QUIZ" | "EVAL" }) {
  const [items, setItems] = useState<QuizItem[]>([]);
  useEffect(() => {
    api<QuizItem[]>(`/quizzes?type=${type}`).then(setItems).catch(() => undefined);
  }, [type]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{type === "EVAL" ? "Evaluations" : "Quiz"}</h1>
      <p className="text-sm text-zinc-400 mb-5">
        {type === "EVAL"
          ? "Mode controle : timer strict et score qui compte plus."
          : "Entraine-toi sans pression pour gagner de l'XP."}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((q) => (
          <Link key={q.id} to={`/jouer/${q.id}`} className="card p-4 hover:border-brand-400/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{q.title}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{q.course.subject.name} - {q.course.title}</div>
              </div>
              <span className={q.type === "EVAL" ? "pill-rose" : "pill-violet"}>{q.type}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-3">
              {q.questionCount} questions - {Math.round(q.timeLimitSec / 60)} min - difficulte {q.difficulty}
            </div>
          </Link>
        ))}
        {items.length === 0 && <div className="card p-5 text-zinc-400 col-span-full">Aucun {type === "EVAL" ? "controle" : "quiz"} pour l'instant.</div>}
      </div>
    </div>
  );
}
