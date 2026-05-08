import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../lib/api";
import DOMPurify from "dompurify";

interface Quiz {
  id: string;
  title: string;
  type: "QUIZ" | "EVAL";
  difficulty: number;
  timeLimitSec: number;
  questionCount: number;
}
interface Course {
  id: string;
  slug: string;
  title: string;
  contentMarkdown: string;
  contentHtml?: string | null;
  contentFormat?: "MARKDOWN" | "HTML" | string;
}
interface Subject {
  id: string;
  slug: string;
  name: string;
}

export default function CoursePage() {
  const { subjectSlug, courseSlug } = useParams();
  const [data, setData] = useState<{ subject: Subject; course: Course; quizzes: Quiz[] } | null>(null);

  useEffect(() => {
    if (!subjectSlug || !courseSlug) return;
    api<{ subject: Subject; course: Course; quizzes: Quiz[] }>(
      `/subjects/${subjectSlug}/courses/${courseSlug}`,
    ).then(setData);
  }, [subjectSlug, courseSlug]);

  if (!data) return <div className="text-zinc-400">Chargement...</div>;

  return (
    <div>
      <Link to={`/cours/${data.subject.slug}`} className="text-sm text-zinc-400 hover:text-zinc-200">
        &larr; {data.subject.name}
      </Link>
      <h1 className="text-2xl font-bold mt-2">{data.course.title}</h1>

      <article className="card p-6 mt-4 markdown space-y-3 leading-relaxed text-zinc-200">
        {data.course.contentFormat === "HTML" && data.course.contentHtml ? (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.course.contentHtml) }}
          />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.course.contentMarkdown}</ReactMarkdown>
        )}
      </article>

      <h2 className="text-lg font-semibold mt-8 mb-2">Quiz et evaluations</h2>
      <div className="space-y-2">
        {data.quizzes.map((q) => (
          <Link key={q.id} to={`/jouer/${q.id}`} className="card p-4 flex items-center justify-between hover:border-brand-400/40">
            <div>
              <div className="font-semibold">{q.title}</div>
              <div className="text-xs text-zinc-400">
                {q.type === "EVAL" ? "Evaluation" : "Quiz"} - {q.questionCount} questions - {Math.round(q.timeLimitSec / 60)} min
              </div>
            </div>
            <span className={q.type === "EVAL" ? "pill-rose" : "pill-violet"}>{q.type}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
