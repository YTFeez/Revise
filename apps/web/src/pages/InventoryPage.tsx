import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import type { PublicUser } from "@revise-plus/shared";

interface OwnedCosmetic {
  id: string;
  acquiredAt: string;
  equipped: boolean;
  cosmetic: {
    id: string;
    slug: string;
    name: string;
    type: "BORDER" | "HAT" | "BG" | "BADGE";
    borderClass?: string;
    rarity: string;
  };
}

export default function InventoryPage() {
  const { user, setUser } = useAuth();
  const [items, setItems] = useState<OwnedCosmetic[]>([]);
  const [filter, setFilter] = useState<"ALL" | "BORDER" | "HAT" | "BG" | "BADGE">("ALL");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((i) => (filter === "ALL" ? true : i.cosmetic.type === filter) && (!query || i.cosmetic.name.toLowerCase().includes(query)));
  }, [items, filter, q]);

  useEffect(() => {
    api<OwnedCosmetic[]>("/me/cosmetics").then(setItems).catch(() => undefined);
  }, []);

  async function equip(type: "BORDER" | "HAT" | "BG", slug: string | null) {
    setBusy(`${type}:${slug ?? "none"}`);
    try {
      const data = await api<{ user: PublicUser }>("/cosmetics/equip", {
        method: "POST",
        body: JSON.stringify({ cosmeticSlug: slug, type }),
      });
      setUser(data.user);
      const next = await api<OwnedCosmetic[]>("/me/cosmetics");
      setItems(next);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Inventaire</h1>
            <p className="text-sm text-zinc-400">Tout ce que tu possedes. Equipe directement ton avatar.</p>
          </div>
          {user && <div className="pill-violet">{user.coins} coins</div>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <input className="input w-full sm:w-64" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex items-center bg-bg-soft rounded-lg p-0.5 text-xs">
            {(["ALL", "BORDER", "HAT", "BG", "BADGE"] as const).map((t) => (
              <button
                key={t}
                className={`px-3 py-1 rounded-md ${filter === t ? "bg-bg-ring text-white" : "text-zinc-400"}`}
                onClick={() => setFilter(t)}
              >
                {t === "ALL" ? "Tout" : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((it) => (
          <div key={it.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{it.cosmetic.name}</div>
              <span className="pill-zinc text-[10px] uppercase">{it.cosmetic.rarity}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">Type: {it.cosmetic.type}</div>
            {it.cosmetic.type === "BORDER" && (
              <div className={`mt-3 h-12 w-12 rounded-full bg-bg-soft ${it.cosmetic.borderClass || ""}`} />
            )}

            <div className="mt-3 flex gap-2">
              {it.cosmetic.type === "BORDER" && (
                <button className="btn-primary w-full" disabled={busy !== null} onClick={() => equip("BORDER", it.cosmetic.slug)}>
                  Equiper
                </button>
              )}
              {it.cosmetic.type === "HAT" && (
                <button className="btn-primary w-full" disabled={busy !== null} onClick={() => equip("HAT", it.cosmetic.slug)}>
                  Equiper
                </button>
              )}
              {it.cosmetic.type === "BG" && (
                <button className="btn-primary w-full" disabled={busy !== null} onClick={() => equip("BG", it.cosmetic.slug)}>
                  Equiper
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="card p-6 text-zinc-400 col-span-full">Rien a afficher.</div>}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Raccourcis</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" disabled={busy !== null} onClick={() => equip("BORDER", null)}>Retirer cadre</button>
          <button className="btn-outline" disabled={busy !== null} onClick={() => equip("HAT", null)}>Retirer chapeau</button>
          <button className="btn-outline" disabled={busy !== null} onClick={() => equip("BG", null)}>Retirer fond</button>
        </div>
      </div>
    </div>
  );
}

