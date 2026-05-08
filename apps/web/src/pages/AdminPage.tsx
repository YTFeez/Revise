import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface Subject { id: string; slug: string; name: string }
interface Course { id: string; slug: string; title: string }

type TabId = "overview" | "content" | "packs" | "users";

interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  level: number;
  totalXp: number;
  coins: number;
  streakDays: number;
  gradeLevel: string | null;
  equippedBorder: string | null;
  equippedHat: string | null;
  equippedBg: string | null;
  equippedAppBg: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<{ users: number; courses: number; quizzes: number; attempts: number } | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [adminCode, setAdminCode] = useState(() => localStorage.getItem("rp_admin_code") || "");

  // course form
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<h1>Mon cours</h1><p>Le contenu ici...</p>",
    editorProps: {
      attributes: {
        class: "min-h-[220px] rounded-xl border border-bg-ring bg-bg-soft p-3 focus:outline-none",
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
  }>>([{ text: "", type: "QCM", points: 1, answers: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }]);

  // users tab state
  const [userQ, setUserQ] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersBusy, setUsersBusy] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editLevel, setEditLevel] = useState<number>(1);
  const [editCoins, setEditCoins] = useState<number>(0);
  const [editIsAdmin, setEditIsAdmin] = useState<boolean>(false);
  const [resetPwd, setResetPwd] = useState<string>("");

  useEffect(() => {
    if (adminCode) localStorage.setItem("rp_admin_code", adminCode);
    api<{ users: number; courses: number; quizzes: number; attempts: number }>("/admin/overview")
      .then(setOverview)
      .catch((e) => setError(e?.message || "Acces refuse"));
    api<Subject[]>("/subjects").then(setSubjects).catch(() => undefined);
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
        body: JSON.stringify({ courseId, title: quizTitle, type: quizType, timeLimitSec: timeLimit, difficulty, questions }),
      });
      setMsg("Quiz cree !");
      setQuizTitle("");
      setQuestions([{ text: "", type: "QCM", points: 1, answers: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }]);
    } catch (e: any) { setError(e?.message || "Erreur"); }
  }

  async function refreshUsers() {
    setUsersBusy(true);
    setError(null);
    try {
      const data = await api<{ users: AdminUserRow[] }>(`/admin/users?q=${encodeURIComponent(userQ.trim())}&take=80`);
      setUsers(data.users);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les utilisateurs");
    } finally {
      setUsersBusy(false);
    }
  }

  async function selectUser(id: string) {
    setSelectedUserId(id);
    setError(null);
    try {
      const data = await api<{ user: AdminUserRow }>("/admin/users/" + id);
      setEditLevel(data.user.level);
      setEditCoins(data.user.coins);
      setEditIsAdmin(!!data.user.isAdmin);
      setResetPwd("");
    } catch (e: any) {
      setError(e?.message || "Impossible de charger l'utilisateur");
    }
  }

  async function saveUser() {
    if (!selectedUserId) return;
    setUsersBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api(`/admin/users/${selectedUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ level: editLevel, coins: editCoins, isAdmin: editIsAdmin }),
      });
      setMsg("Utilisateur mis a jour.");
      await refreshUsers();
    } catch (e: any) {
      setError(e?.message || "Update impossible");
    } finally {
      setUsersBusy(false);
    }
  }

  async function doResetPassword() {
    if (!selectedUserId) return;
    if (!resetPwd.trim()) { setError("Entre un nouveau mot de passe."); return; }
    setUsersBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api(`/admin/users/${selectedUserId}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: resetPwd }) });
      setMsg("Mot de passe reinitialise.");
      setResetPwd("");
    } catch (e: any) {
      setError(e?.message || "Reset impossible");
    } finally {
      setUsersBusy(false);
    }
  }

  async function deleteUser() {
    if (!selectedUserId) return;
    const ok = confirm("Supprimer DEFINITIVEMENT ce compte ?");
    if (!ok) return;
    setUsersBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api(`/admin/users/${selectedUserId}`, { method: "DELETE" });
      setMsg("Compte supprime.");
      setSelectedUserId(null);
      await refreshUsers();
    } catch (e: any) {
      setError(e?.message || "Suppression impossible");
    } finally {
      setUsersBusy(false);
    }
  }

  function updateQuestion(idx: number, patch: Partial<typeof questions[number]>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin Revise+</h1>
        <p className="text-sm text-zinc-400">Tout gerer: contenus, packs, utilisateurs.</p>
      </div>

      <div className="card p-4">
        <div className="text-xs text-zinc-400 mb-1">Code admin (obligatoire)</div>
        <input className="input" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} placeholder="Entre ton code admin..." />
        <div className="text-[11px] text-zinc-500 mt-1">Stocke localement sur ton navigateur.</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>Vue d'ensemble</TabBtn>
        <TabBtn active={tab === "content"} onClick={() => setTab("content")}>Contenu</TabBtn>
        <TabBtn active={tab === "packs"} onClick={() => setTab("packs")}>Packs</TabBtn>
        <TabBtn active={tab === "users"} onClick={() => { setTab("users"); refreshUsers(); }}>Utilisateurs</TabBtn>
      </div>

      {error && <div className="card p-3 text-rose-300">{error}</div>}
      {msg && <div className="card p-3 text-emerald-300">{msg}</div>}

      {tab === "overview" && (
        <div>
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Utilisateurs" value={overview.users} />
              <Stat label="Cours" value={overview.courses} />
              <Stat label="Quiz" value={overview.quizzes} />
              <Stat label="Essais" value={overview.attempts} />
            </div>
          )}
          {!overview && <div className="card p-5 text-zinc-400">Chargement...</div>}
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-4">
          <section className="card p-5">
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
                    <input className="input" placeholder={`Question ${qi + 1}`} value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} required />
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
                            onChange={() => updateQuestion(qi, { answers: q.answers.map((x, j) => ({ ...x, isCorrect: j === ai })) })}
                          />
                          <input
                            className="input"
                            placeholder={`Reponse ${ai + 1}`}
                            value={a.text}
                            onChange={(e) => updateQuestion(qi, { answers: q.answers.map((x, j) => (j === ai ? { ...x, text: e.target.value } : x)) })}
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
      )}

      {tab === "packs" && (
        <div className="card p-5 text-zinc-400">
          Import pack JSON deja dispo via API: `POST /api/admin/packs/import` (je peux te faire un vrai UI d'import juste apres).
        </div>
      )}

      {tab === "users" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card p-4 md:col-span-2">
            <div className="flex flex-wrap gap-2 items-center">
              <input className="input flex-1" placeholder="Rechercher email / pseudo / id..." value={userQ} onChange={(e) => setUserQ(e.target.value)} />
              <button className="btn-outline" onClick={refreshUsers} disabled={usersBusy}>{usersBusy ? "..." : "Rechercher"}</button>
            </div>
            <div className="mt-3 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="text-left py-2">Pseudo</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Lvl</th>
                    <th className="text-left py-2">Coins</th>
                    <th className="text-left py-2">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-t border-bg-ring/60 hover:bg-bg-soft/40 cursor-pointer ${selectedUserId === u.id ? "bg-bg-soft/60" : ""}`}
                      onClick={() => selectUser(u.id)}
                    >
                      <td className="py-2 font-semibold">{u.username}</td>
                      <td className="py-2 text-zinc-300">{u.email}</td>
                      <td className="py-2">{u.level}</td>
                      <td className="py-2">{u.coins}</td>
                      <td className="py-2">{u.isAdmin ? "oui" : "non"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <div className="text-zinc-500 text-sm mt-3">Aucun resultat.</div>}
            </div>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-2">Actions</div>
            {!selectedUserId ? (
              <div className="text-sm text-zinc-500">Selectionne un utilisateur.</div>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <div className="text-xs text-zinc-400 mb-1">Niveau</div>
                  <input className="input" type="number" min={1} max={1000} value={editLevel} onChange={(e) => setEditLevel(parseInt(e.target.value, 10))} />
                </label>
                <label className="block">
                  <div className="text-xs text-zinc-400 mb-1">Coins</div>
                  <input className="input" type="number" min={0} value={editCoins} onChange={(e) => setEditCoins(parseInt(e.target.value, 10))} />
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={editIsAdmin} onChange={(e) => setEditIsAdmin(e.target.checked)} />
                  Admin
                </label>
                <button className="btn-primary w-full" onClick={saveUser} disabled={usersBusy}>Sauvegarder</button>

                <div className="h-px bg-bg-ring/60" />
                <div className="text-xs text-zinc-400">Reset mot de passe</div>
                <input className="input" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="Nouveau mot de passe..." />
                <button className="btn-outline w-full" onClick={doResetPassword} disabled={usersBusy}>Reset</button>

                <div className="h-px bg-bg-ring/60" />
                <button className="btn-outline w-full !border-rose-500/40 !text-rose-200 hover:!bg-rose-500/10" onClick={deleteUser} disabled={usersBusy}>
                  Supprimer le compte
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      className={active ? "btn-primary !py-1.5 !px-3 text-sm" : "btn-ghost !py-1.5 !px-3 text-sm"}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
