import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch {}
  }

  return (
    <div className="max-w-md mx-auto card p-6 mt-10">
      <h1 className="text-2xl font-bold mb-1">Connexion</h1>
      <p className="text-sm text-zinc-400 mb-5">Bon retour sur Revise<span className="text-brand-400">+</span> !</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-xs text-zinc-400">Email</span>
          <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-400">Mot de passe</span>
          <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p className="text-sm text-zinc-400 mt-4 text-center">
        Pas encore de compte ? <Link to="/register" className="text-brand-300 hover:underline">Creer un compte</Link>
      </p>
      <p className="text-xs text-zinc-500 mt-6 text-center">
        Compte demo: <code>lea@revise-plus.local</code> / <code>demo1234</code>
      </p>
    </div>
  );
}
