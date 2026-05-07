import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { rankForLevel } from "@revise-plus/shared";

interface Question {
  id: string;
  text: string;
  type: "QCM" | "VRAI_FAUX" | "TEXTE";
  points: number;
  answers: { id: string; text: string }[];
}

interface AttemptStart {
  attemptId: string;
  quiz: {
    id: string;
    title: string;
    type: "QUIZ" | "EVAL";
    timeLimitSec: number;
    difficulty: number;
    questionCount: number;
  };
  questions: Question[];
  startedAt: string;
  expiresAt: string;
}

interface AttemptResult {
  attemptId: string;
  scorePct: number;
  correctCount: number;
  totalQuestions: number;
  xpGained: number;
  coinsGained: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  newRankName?: string;
  durationSec: number;
}

export default function QuizPlayPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { fetchMe } = useAuth();
  const [attempt, setAttempt] = useState<AttemptStart | null>(null);
  const [responses, setResponses] = useState<Record<string, string[] | string>>({});
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!quizId) return;
    setError(null);
    api<AttemptStart>("/quizzes/start", {
      method: "POST",
      body: JSON.stringify({ quizId }),
    })
      .then(setAttempt)
      .catch((e) => setError(e?.message || "Impossible de demarrer le quiz"));
  }, [quizId]);

  useEffect(() => {
    if (!attempt || result) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [attempt, result]);

  const remainingMs = attempt ? new Date(attempt.expiresAt).getTime() - now : 0;
  const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
  const remaining = useMemo(() => formatTime(remainingSec), [remainingSec]);

  // auto-submit when time runs out
  useEffect(() => {
    if (!attempt || result || submittedRef.current) return;
    if (remainingSec === 0) {
      submittedRef.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, attempt, result]);

  function setAnswer(qId: string, value: string[] | string) {
    setResponses((r) => ({ ...r, [qId]: value }));
  }

  async function submit() {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        attemptId: attempt.attemptId,
        answers: Object.entries(responses).map(([questionId, val]) =>
          Array.isArray(val) ? { questionId, answerIds: val } : { questionId, text: val },
        ),
      };
      const res = await api<AttemptResult>("/quizzes/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(res);
      fetchMe();
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <div className="card p-6 text-rose-300">{error}</div>;
  if (!attempt) return <div className="text-zinc-400">Preparation du quiz...</div>;

  if (result) {
    const rank = rankForLevel(result.levelAfter);
    return (
      <div className="max-w-xl mx-auto card p-6 text-center">
        <h1 className="text-2xl font-extrabold mb-1">Termine !</h1>
        <p className="text-sm text-zinc-400 mb-4">Bravo, voici tes resultats.</p>
        <div className="text-5xl font-extrabold text-brand-300 mb-2">{result.scorePct}%</div>
        <div className="text-zinc-400 text-sm">{result.correctCount} / {result.totalQuestions} bonnes reponses</div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="card p-3"><div className="text-xs text-zinc-500">XP gagne</div><div className="text-xl font-bold text-emerald-300">+{result.xpGained}</div></div>
          <div className="card p-3"><div className="text-xs text-zinc-500">Coins gagnes</div><div className="text-xl font-bold text-amber-300">+{result.coinsGained}</div></div>
        </div>
        {result.leveledUp && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-emerald-300 font-bold">Niveau {result.levelAfter} atteint !</div>
            {result.newRankName && <div className={`text-sm mt-1 ${rank.textClass}`}>Nouveau grade : {result.newRankName}</div>}
          </div>
        )}
        <div className="flex gap-2 mt-5 justify-center">
          <button className="btn-ghost" onClick={() => { setResult(null); setResponses({}); navigate(-1); }}>Retour</button>
          <button className="btn-primary" onClick={() => navigate("/quiz")}>Autre quiz</button>
        </div>
      </div>
    );
  }

  const isEval = attempt.quiz.type === "EVAL";
  return (
    <div>
      <div className="card p-4 sticky top-16 z-20 mb-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">{attempt.quiz.title}</div>
          <div className="text-xs text-zinc-400">{isEval ? "Evaluation" : "Quiz"} - {attempt.questions.length} questions</div>
        </div>
        <div className={`text-xl font-mono font-bold ${remainingSec < 30 ? "text-rose-300" : "text-zinc-100"}`}>{remaining}</div>
        <button className="btn-primary" disabled={submitting} onClick={submit}>{submitting ? "..." : "Valider"}</button>
      </div>

      <ol className="space-y-4">
        {attempt.questions.map((q, i) => (
          <li key={q.id} className="card p-5">
            <div className="text-xs text-zinc-500 mb-1">Question {i + 1} / {attempt.questions.length} - {q.points} pt</div>
            <div className="font-medium mb-3 whitespace-pre-line">{q.text}</div>
            {q.type === "TEXTE" ? (
              <input
                className="input"
                placeholder="Ta reponse..."
                value={(responses[q.id] as string) || ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
              />
            ) : (
              <div className="grid gap-2">
                {q.answers.map((a) => {
                  const selected = ((responses[q.id] as string[]) || []).includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAnswer(q.id, [a.id])}
                      className={`text-left rounded-xl px-4 py-3 border transition-colors ${
                        selected
                          ? "bg-brand-500/15 border-brand-400 text-white"
                          : "bg-bg-soft border-bg-ring hover:border-brand-400/40"
                      }`}
                    >
                      {a.text}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-5 flex justify-end">
        <button className="btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? "..." : "Terminer et valider"}
        </button>
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
