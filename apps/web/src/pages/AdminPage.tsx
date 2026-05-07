import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";

interface Subject { id: string; slug: string; name: string }
interface Course { id: string; slug: string; title: string }

export default function AdminPage() {
  const [overview, setOverview] = useState<{ users: number; courses: number; quizzes: number; attempts: number } | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // course form
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("# Mon cours\n\nLe contenu en markdown...");
  const [courseId, setCourseId] = useState<string | null>(null);

  // quiz form
  const [quizTitle, setQuizTitle] = useState("");
  const [quizType, setQuizType] = useState<"QUIZ" | "EVAL">("QUIZ");
  const [timeLimit, setTimeLimit] = useState(300);
  const [difficulty, setDifficulty] = useState(1);
  const [questions, setQuestions] = useState<Array<{
    text: string;
    type: "QCM" | "VRAI_FAUX";
    points: number;
    answers: { text: string; isCorrect: boolean }[];
  }>>([
    { text: "", type: "QCM", points: 1, answers: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] },
  ]);

  useEffect(() => {
    api<{ users: number; courses: number; quizzes: number; attempts: number }>("/admin/overview")
      .then(setOverview)
      .catch((e) => setError(e?.message || "Acces refuse"));
    api<Subject[]>("/subjects").then(setSubjects);
  }, []);

  async function createCourse(e: FormEvent) {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      const res = await api<{ course: Course }>("/admin/courses", {
        method: "POST",
        body: JSON.stringify({ subjectId, title, contentMarkdown: content, order: 0 }),
      });
      setMsg(`Cours cree : ${res.course.title}`);
      setCourseId(res.course.id);
    } catch (e: any) { setError(e?.message || "Erreur"); }
  }

  async function createQuiz(e: FormEvent) {
    e.preventDefault();
    setError(null); setMsg(null);
    if (!courseId) { setError("Cree d'abord un cours."); return; }
    try {
      await api("/admin/quizzes", {
        method: "POST",
        body: JSON.stringify({
          courseId,
          title: quizTitle,
          type: quizType,
          timeLimitSec: timeLimit,
          difficulty,
          questions,
        }),
      });
      setMsg("Quiz cree !");
      setQuizTitle("");
      setQuestions([{ text: "", type: "QCM", points: 1, answers: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }]);
    } catch (e: any) { setError(e?.message || "Erreur"); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Admin Revise+</h1>
      <p className="text-sm text-zinc-400 mb-5">Cree des cours et des quiz.</p>

      {error && <div className="card p-3 text-rose-300 mb-3">{error}</div>}
      {msg && <div className="card p-3 text-emerald-300 mb-3">{msg}</div>}

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Utilisateurs" value={overview.users} />
          <Stat label="Cours" value={overview.courses} />
          <Stat label="Quiz" value={overview.quizzes} />
          <Stat label="Essais" value={overview.attempts} />
        </div>
      )}

      <section className="card p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Nouveau cours</h2>
        <form className="space-y-3" onSubmit={createCourse}>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            <option value="">Choisir une matiere</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input className="input" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="input min-h-[200px] font-mono" placeholder="Contenu en markdown" value={content} onChange={(e) => setContent(e.target.value)} required />
          <button className="btn-primary">Creer le cours</button>
        </form>
        {courseId && <p className="text-xs text-emerald-300 mt-2">Course id pret : {courseId}</p>}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold mb-3">Nouveau quiz {courseId ? "" : "(cree d'abord un cours)"}</h2>
        <form className="space-y-3" onSubmit={createQuiz}>
          <input className="input" placeholder="Titre du quiz" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />
          <div className="grid grid-cols-3 gap-2">
            <select className="input" value={quizType} onChange={(e) => setQuizType(e.target.value as any)}>
              <option value="QUIZ">Quiz</option>
              <option value="EVAL">Evaluation</option>
            </select>
            <input className="input" type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))} min={30} />
            <input className="input" type="number" value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value, 10))} min={1} max={3} />
          </div>

          <div className="space-y-3">
            {questions.map((q, qi) => (
              <div key={qi} className="card p-3">
                <input
                  className="input"
                  placeholder={`Question ${qi + 1}`}
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select className="input" value={q.type} onChange={(e) => updateQuestion(qi, { type: e.target.value as any })}>
                    <option value="QCM">QCM</option>
                    <option value="VRAI_FAUX">Vrai/Faux</option>
                  </select>
                  <input className="input" type="number" min={1} max={20} value={q.points} onChange={(e) => updateQuestion(qi, { points: parseInt(e.target.value, 10) })} />
                </div>
                <div className="space-y-1 mt-2">
                  {q.answers.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q-${qi}-correct`}
                        checked={a.isCorrect}
                        onChange={() => updateQuestion(qi, {
                          answers: q.answers.map((x, j) => ({ ...x, isCorrect: j === ai })),
                        })}
                      />
                      <input
                        className="input"
                        placeholder={`Reponse ${ai + 1}`}
                        value={a.text}
                        onChange={(e) =>
                          updateQuestion(qi, {
                            answers: q.answers.map((x, j) => (j === ai ? { ...x, text: e.target.value } : x)),
                          })
                        }
                        required
                      />
                    </div>
                  ))}
                  <button type="button" className="btn-outline text-xs" onClick={() => updateQuestion(qi, { answers: [...q.answers, { text: "", isCorrect: false }] })}>+ reponse</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-ghost text-xs" onClick={() => setQuestions([...questions, { text: "", type: "QCM", points: 1, answers: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }])}>+ question</button>
          </div>

          <button className="btn-primary" disabled={!courseId}>Creer le quiz</button>
        </form>
      </section>
    </div>
  );

  function updateQuestion(idx: number, patch: Partial<typeof questions[number]>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-2xl font-bold text-brand-300">{value}</div>
    </div>
  );
}
