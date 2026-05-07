import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import type { PublicUser } from "@revise-plus/shared";

interface Cosmetic {
  id: string;
  slug: string;
  name: string;
  type: "BORDER" | "HAT" | "BG" | "BADGE";
  description?: string;
  priceCoins: number;
  requiredLevel: number;
  borderClass?: string;
  rarity: string;
  owned: boolean;
}

const rarityClass: Record<string, string> = {
  common: "border-zinc-500/30 bg-zinc-500/10",
  rare: "border-sky-400/40 bg-sky-500/10",
  epic: "border-violet-400/40 bg-violet-500/10",
  legendary: "border-amber-400/40 bg-amber-500/10",
};

export default function ShopPage() {
  const { user, setUser } = useAuth();
  const [items, setItems] = useState<Cosmetic[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api<Cosmetic[]>("/cosmetics").then(setItems).catch(() => undefined);
  }
  useEffect(() => { refresh(); }, []);

  async function purchase(slug: string) {
    setBusy(slug);
    setError(null);
    try {
      const data = await api<{ user: PublicUser }>("/cosmetics/purchase", {
        method: "POST",
        body: JSON.stringify({ cosmeticSlug: slug }),
      });
      setUser(data.user);
      refresh();
    } catch (e: any) {
      setError(e?.message || "Achat impossible");
    } finally {
      setBusy(null);
    }
  }

  const grouped = {
    BORDER: items.filter((i) => i.type === "BORDER"),
    HAT: items.filter((i) => i.type === "HAT"),
    BG: items.filter((i) => i.type === "BG"),
    BADGE: items.filter((i) => i.type === "BADGE"),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold">Boutique</h1>
          <p className="text-sm text-zinc-400">Depense tes Revise coins pour personnaliser ton avatar.</p>
        </div>
        {user && <div className="pill-violet">{user.coins} coins</div>}
      </div>
      {error && <div className="text-rose-400 text-sm mb-3">{error}</div>}

      {([
        ["BORDER", "Cadres d'avatar"],
        ["HAT", "Chapeaux"],
        ["BG", "Fonds"],
        ["BADGE", "Badges"],
      ] as const).map(([key, title]) => (
        <section key={key} className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">{title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {grouped[key].map((it) => {
              const locked = !!user && user.level < it.requiredLevel;
              return (
                <div key={it.id} className={`rounded-2xl border p-4 ${rarityClass[it.rarity] || rarityClass.common}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{it.name}</div>
                    <span className="pill-zinc text-[10px] uppercase">{it.rarity}</span>
                  </div>
                  {it.description && <p className="text-xs text-zinc-400 mt-1">{it.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-zinc-400">Niv. {it.requiredLevel}</div>
                    <div className="text-amber-300 font-semibold">{it.priceCoins} coins</div>
                  </div>
                  <div className="mt-3">
                    {it.owned ? (
                      <button className="btn-outline w-full" disabled>Possede</button>
                    ) : (
                      <button
                        className="btn-primary w-full"
                        disabled={!user || locked || busy === it.slug || (user.coins < it.priceCoins)}
                        onClick={() => purchase(it.slug)}
                      >
                        {locked ? `Niv. ${it.requiredLevel} requis` : busy === it.slug ? "..." : "Acheter"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
