import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gradeLevel, setGradeLevel] = useState("3e");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await register({ email, username, password, gradeLevel });
      navigate("/");
    } catch {}
  }

  return (
    <div className="max-w-md mx-auto card p-6 mt-10">
      <h1 className="text-2xl font-bold mb-1">Creer ton compte</h1>
      <p className="text-sm text-zinc-400 mb-5">Bienvenue sur Revise<span className="text-brand-400">+</span>. Tu commences avec 50 coins offerts.</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-xs text-zinc-400">Pseudo</span>
          <input className="input mt-1" required minLength={2} maxLength={24} value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-400">Email</span>
          <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-400">Mot de passe</span>
          <div className="mt-1 relative">
            <input
              className="input pr-20"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg border border-bg-ring bg-bg-card text-zinc-300 hover:bg-bg-soft"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-zinc-400">Classe</span>
          <select className="input mt-1" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
            <option value="6e">6e</option>
            <option value="5e">5e</option>
            <option value="4e">4e</option>
            <option value="3e">3e</option>
          </select>
        </label>
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : "Creer mon compte"}</button>
      </form>
      <p className="text-sm text-zinc-400 mt-4 text-center">
        Deja un compte ? <Link to="/login" className="text-brand-300 hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
