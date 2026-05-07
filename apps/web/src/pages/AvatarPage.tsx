import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { AvatarBorder } from "../components/AvatarBorder";
import { rankForLevel, RANKS } from "@revise-plus/shared";
import type { PublicUser } from "@revise-plus/shared";

interface OwnedCosmetic {
  id: string;
  equipped: boolean;
  cosmetic: { id: string; slug: string; name: string; type: "BORDER" | "HAT" | "BG" | "BADGE"; borderClass?: string };
}

export default function AvatarPage() {
  const { user, setUser, fetchMe } = useAuth();
  const [owned, setOwned] = useState<OwnedCosmetic[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<OwnedCosmetic[]>("/me/cosmetics").then(setOwned).catch(() => undefined);
  }, []);

  if (!user) return null;
  const rank = rankForLevel(user.level);

  const borders = owned.filter((o) => o.cosmetic.type === "BORDER");

  async function equipBorder(slug: string | null) {
    setBusy(true);
    try {
      const data = await api<{ user: PublicUser }>("/cosmetics/equip", {
        method: "POST",
        body: JSON.stringify({ cosmeticSlug: slug, type: "BORDER" }),
      });
      setUser(data.user);
      fetchMe();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Choisis ton personnage</h1>
      <p className="text-sm text-zinc-400 mb-5">Ton cadre evolue avec ton niveau, et tu peux en acheter de speciaux dans la boutique.</p>

      <div className="card p-6 flex flex-col items-center gap-3">
        <AvatarBorder level={user.level} username={user.username} size={120} showBadge />
        <div className="text-lg font-semibold">{user.username}</div>
        <div className={`text-sm ${rank.textClass}`}>Niv. {user.level} - {rank.name}</div>
      </div>

      <h3 className="text-sm font-semibold text-zinc-300 mt-6 mb-2">Tous les grades (palier de niveau)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {RANKS.map((r) => {
          const reached = user.level >= r.levelMin;
          return (
            <div key={r.name} className={`rounded-2xl border p-4 text-center ${reached ? "border-bg-ring bg-bg-card" : "border-bg-ring bg-bg-card opacity-50"}`}>
              <div className="flex justify-center mb-2">
                <div className={`h-14 w-14 rounded-full bg-bg-soft flex items-center justify-center text-zinc-300 font-bold ${r.borderClass}`}>
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div className={`text-sm font-semibold ${reached ? r.textClass : "text-zinc-500"}`}>{r.name}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Niv. {r.levelMin}-{r.levelMax}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{r.description}</div>
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold text-zinc-300 mt-6 mb-2">Mes cadres</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <button
          className={`rounded-2xl border p-4 text-center ${user.equippedBorder === null ? "border-brand-400 bg-brand-500/10" : "border-bg-ring bg-bg-card"}`}
          onClick={() => equipBorder(null)}
          disabled={busy}
        >
          <div className="h-14 w-14 mx-auto rounded-full bg-bg-soft flex items-center justify-center text-zinc-300">--</div>
          <div className="text-xs mt-2">Cadre par defaut (selon grade)</div>
        </button>
        {borders.map((b) => (
          <button
            key={b.id}
            className={`rounded-2xl border p-4 text-center ${user.equippedBorder === b.cosmetic.slug ? "border-brand-400 bg-brand-500/10" : "border-bg-ring bg-bg-card"}`}
            onClick={() => equipBorder(b.cosmetic.slug)}
            disabled={busy}
          >
            <div className={`h-14 w-14 mx-auto rounded-full bg-bg-soft flex items-center justify-center text-zinc-300 ${b.cosmetic.borderClass || ""}`}>
              {b.cosmetic.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-xs mt-2">{b.cosmetic.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
