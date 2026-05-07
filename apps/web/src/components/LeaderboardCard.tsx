import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { AvatarBorder } from "./AvatarBorder";
import { useAuth } from "../store/auth";

interface Entry {
  position: number;
  userId: string;
  username: string;
  level: number;
  totalXp: number;
  weeklyXp: number;
  rankName: string;
  rankBorderClass: string;
}

type Scope = "weekly" | "global";

export function LeaderboardCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("weekly");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<Entry[]>(`/leaderboard?scope=${scope}`).then((data) => {
      if (alive) setEntries(data);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [scope]);

  useEffect(() => {
    const s = getSocket();
    s.emit("subscribe:leaderboard");
    const onDirty = () => {
      api<Entry[]>(`/leaderboard?scope=${scope}`).then(setEntries).catch(() => undefined);
    };
    s.on("leaderboard:dirty", onDirty);
    return () => {
      s.emit("unsubscribe:leaderboard");
      s.off("leaderboard:dirty", onDirty);
    };
  }, [scope]);

  const items = compact ? entries.slice(0, 5) : entries;
  const meIndex = entries.findIndex((e) => e.userId === user?.id);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15 text-amber-300">
            <TrophyIcon />
          </span>
          <h3 className="text-sm font-semibold text-zinc-300">Classement</h3>
        </div>
        <div className="flex items-center bg-bg-soft rounded-lg p-0.5 text-xs">
          <button
            className={`px-3 py-1 rounded-md ${scope === "weekly" ? "bg-bg-ring text-white" : "text-zinc-400"}`}
            onClick={() => setScope("weekly")}
          >
            Cette semaine
          </button>
          <button
            className={`px-3 py-1 rounded-md ${scope === "global" ? "bg-bg-ring text-white" : "text-zinc-400"}`}
            onClick={() => setScope("global")}
          >
            Global
          </button>
        </div>
      </div>

      {loading && <div className="text-zinc-500 text-sm">Chargement...</div>}
      {!loading && items.length === 0 && <div className="text-zinc-500 text-sm">Aucun joueur pour l'instant.</div>}

      <ul className="space-y-1.5">
        {items.map((e) => {
          const isMe = user?.id === e.userId;
          return (
            <li
              key={e.userId}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${isMe ? "bg-brand-500/10 border border-brand-400/30" : "hover:bg-bg-soft/60"}`}
            >
              <span className="w-5 text-center text-xs text-zinc-500 tabular-nums">{e.position}</span>
              <AvatarBorder level={e.level} username={e.username} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {e.username}{isMe && <span className="ml-1 text-brand-300">(toi)</span>}
                </div>
                <div className="text-[11px] text-zinc-500">{e.rankName} - Niv. {e.level}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-brand-300">
                  {scope === "weekly" ? e.weeklyXp.toLocaleString("fr-FR") : e.totalXp.toLocaleString("fr-FR")} XP
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {compact && meIndex >= 5 && user && (
        <div className="mt-2 pt-2 border-t border-bg-ring/60 text-xs text-zinc-400">
          Tu es {meIndex + 1}eme / {entries.length}.
        </div>
      )}
    </section>
  );
}

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 4h14v3a5 5 0 01-5 5h-.18A5 5 0 0010 17v1H8v2h8v-2h-2v-1a3 3 0 013-3 7 7 0 007-7V4H5zm2 2h2v3a3 3 0 11-2 0V6zm10 0h2v3a3 3 0 11-2 0V6z" />
    </svg>
  );
}
