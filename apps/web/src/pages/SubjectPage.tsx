import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

interface Course {
  id: string;
  slug: string;
  title: string;
  order: number;
  quizCount: number;
}
interface Subject {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export default function SubjectPage() {
  const { subjectSlug } = useParams();
  const [data, setData] = useState<{ subject: Subject; courses: Course[] } | null>(null);

  useEffect(() => {
    if (!subjectSlug) return;
    api<{ subject: Subject; courses: Course[] }>(`/subjects/${subjectSlug}/courses`).then(setData);
  }, [subjectSlug]);

  if (!data) return <div className="text-zinc-400">Chargement...</div>;
  return (
    <div>
      <Link to="/cours" className="text-sm text-zinc-400 hover:text-zinc-200">&larr; Toutes les matieres</Link>
      <h1 className="text-2xl font-bold mt-2">{data.subject.name}</h1>

      <div className="mt-5 space-y-2">
        {data.courses.length === 0 && <div className="card p-5 text-zinc-400">Aucun cours pour cette matiere pour le moment.</div>}
        {data.courses.map((c) => (
          <Link key={c.id} to={`/cours/${data.subject.slug}/${c.slug}`} className="card p-4 flex items-center justify-between hover:border-brand-400/40">
            <div>
              <div className="font-semibold">{c.title}</div>
              <div className="text-xs text-zinc-400">{c.quizCount} quiz</div>
            </div>
            <span className="text-zinc-500">&rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
