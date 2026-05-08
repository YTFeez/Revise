import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";

type MiniUser = { id: string; username: string; level: number };

export default function FriendsPage() {
  const [friends, setFriends] = useState<Array<{ id: string; user: MiniUser; since: string }>>([]);
  const [incoming, setIncoming] = useState<Array<{ id: string; from: MiniUser; createdAt: string }>>([]);
  const [outgoing, setOutgoing] = useState<Array<{ id: string; to: MiniUser; createdAt: string }>>([]);
  const [toUsername, setToUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    await Promise.all([
      api("/friends").then(setFriends),
      api("/friends/requests/in").then(setIncoming),
      api("/friends/requests/out").then(setOutgoing),
    ]).catch((e: any) => setError(e?.message || "Erreur"));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function sendRequest(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    try {
      await api("/friends/request", { method: "POST", body: JSON.stringify({ toUsername }) });
      setMsg("Demande envoyee !");
      setToUsername("");
      refresh();
    } catch (e: any) {
      setError(e?.message || "Erreur");
    }
  }

  async function decide(requestId: string, accept: boolean) {
    setError(null);
    await api("/friends/decide", { method: "POST", body: JSON.stringify({ requestId, accept }) })
      .then(() => refresh())
      .catch((e: any) => setError(e?.message || "Erreur"));
  }

  async function remove(userId: string) {
    setError(null);
    await api("/friends/remove", { method: "POST", body: JSON.stringify({ userId }) })
      .then(() => refresh())
      .catch((e: any) => setError(e?.message || "Erreur"));
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-1">Amis</h1>
        <p className="text-sm text-zinc-400">Ajoute des amis pour comparer vos niveaux et lancer des defis.</p>
        {error && <div className="text-rose-300 text-sm mt-3">{error}</div>}
        {msg && <div className="text-emerald-300 text-sm mt-3">{msg}</div>}

        <form className="mt-4 flex gap-2" onSubmit={sendRequest}>
          <input className="input" value={toUsername} onChange={(e) => setToUsername(e.target.value)} placeholder="Pseudo d'un ami..." />
          <button className="btn-primary whitespace-nowrap">Envoyer</button>
        </form>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Demandes recues</h3>
          <div className="space-y-2">
            {incoming.length === 0 && <div className="text-sm text-zinc-500">Aucune.</div>}
            {incoming.map((r) => (
              <div key={r.id} className="rounded-xl border border-bg-ring bg-bg-soft p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.from.username}</div>
                  <div className="text-xs text-zinc-400">Niv. {r.from.level}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary !py-1 !px-2 text-xs" onClick={() => decide(r.id, true)}>Accepter</button>
                  <button className="btn-outline !py-1 !px-2 text-xs" onClick={() => decide(r.id, false)}>Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Demandes envoyees</h3>
          <div className="space-y-2">
            {outgoing.length === 0 && <div className="text-sm text-zinc-500">Aucune.</div>}
            {outgoing.map((r) => (
              <div key={r.id} className="rounded-xl border border-bg-ring bg-bg-soft p-3">
                <div className="font-semibold">{r.to.username}</div>
                <div className="text-xs text-zinc-400">En attente</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Mes amis</h3>
          <div className="space-y-2">
            {friends.length === 0 && <div className="text-sm text-zinc-500">Aucun ami pour l'instant.</div>}
            {friends.map((f) => (
              <div key={f.id} className="rounded-xl border border-bg-ring bg-bg-soft p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{f.user.username}</div>
                  <div className="text-xs text-zinc-400">Niv. {f.user.level}</div>
                </div>
                <button className="btn-outline !py-1 !px-2 text-xs" onClick={() => remove(f.user.id)}>Retirer</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

