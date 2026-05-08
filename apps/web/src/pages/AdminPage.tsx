import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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
  const [adminCode, setAdminCode] = useState(() => localStorage.getItem("rp_admin_code") || "");
  const [courseId, setCourseId] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<h1>Mon cours</h1><p>Le contenu ici...</p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] rounded-xl border border-bg-ring bg-bg-soft p-3 focus:outline-none",
      },
    },
  });

  const htmlContent = useMemo(() => editor?.getHTML() ?? "", [editor, editor?.state]);

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
    if (adminCode) localStorage.setItem("rp_admin_code", adminCode);
    api<{ users: number; courses: number; quizzes: number; attempts: number }>("/admin/overview")
      .then(setOverview)
      .catch((e) => setError(e?.message || "Acces refuse"));
    api<Subject[]>("/subjects").then(setSubjects);
  }, [adminCode]);

  async function createCourse(e: FormEvent) {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      const res = await api<{ course: Course }>("/admin/courses", {
        method: "POST",
        body: JSON.stringify({ subjectId, title, contentHtml: htmlContent, contentFormat: "HTML", order: 0 }),
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

      <div className="card p-4 mb-4">
        <div className="text-xs text-zinc-400 mb-1">Code admin (obligatoire)</div>
        <input className="input" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} placeholder="Entre ton code admin..." />
        <div className="text-[11px] text-zinc-500 mt-1">Ce code est stocke localement sur ton navigateur.</div>
      </div>

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
          <div>
            <div className="text-xs text-zinc-400 mb-1">Contenu (editeur riche)</div>
            <div className="rounded-xl border border-bg-ring overflow-hidden">
              <div className="flex flex-wrap gap-1 p-2 bg-bg-card border-b border-bg-ring">
                <Btn onClick={() => editor?.chain().focus().toggleBold().run()} active={!!editor?.isActive("bold")}>Gras</Btn>
                <Btn onClick={() => editor?.chain().focus().toggleItalic().run()} active={!!editor?.isActive("italic")}>Italique</Btn>
                <Btn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={!!editor?.isActive("bulletList")}>Liste</Btn>
                <Btn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={!!editor?.isActive("orderedList")}>1.2.3</Btn>
                <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={!!editor?.isActive("heading", { level: 2 })}>Titre</Btn>
                <Btn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={!!editor?.isActive("blockquote")}>Citation</Btn>
                <Btn onClick={() => editor?.chain().focus().setHorizontalRule().run()} active={false}>---</Btn>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>
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

function Btn({ onClick, active, children }: { onClick: () => void; active: boolean; children: any }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-lg text-xs border ${active ? "bg-brand-500/20 border-brand-400/40 text-white" : "bg-bg-soft border-bg-ring text-zinc-300"}`}
    >
      {children}
    </button>
  );
}
