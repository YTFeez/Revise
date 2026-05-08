import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import type { PublicUser } from "@revise-plus/shared";

interface Cosmetic {
  id: string;
  slug: string;
  name: string;
  type: "BORDER" | "HAT" | "BG" | "APP_BG" | "BADGE";
  description?: string;
  priceCoins: number;
  requiredLevel: number;
  borderClass?: string;
  rarity: string;
  owned: boolean;
}

interface Rotation {
  id: string;
  startsAt: string;
  endsAt: string;
  listings: Array<{
    id: string;
    priceCoins: number;
    featured: boolean;
    stock: number | null;
    sold: number;
    cosmetic: Cosmetic;
  }>;
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
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | Cosmetic["type"]>("ALL");
  const [onlyNotOwned, setOnlyNotOwned] = useState(false);

  function refresh() {
    api<Cosmetic[]>("/cosmetics").then(setItems).catch(() => undefined);
    api<{ rotation: Rotation | null }>("/shop/rotation").then((d) => setRotation(d.rotation)).catch(() => undefined);
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

  async function buyListing(listingId: string) {
    setBusy(listingId);
    setError(null);
    try {
      const data = await api<{ user: PublicUser }>("/shop/buy", {
        method: "POST",
        body: JSON.stringify({ listingId }),
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
  const filtered = items.filter((i) => {
    const q = query.trim().toLowerCase();
    if (q && !i.name.toLowerCase().includes(q) && !(i.description || "").toLowerCase().includes(q)) return false;
    if (typeFilter !== "ALL" && i.type !== typeFilter) return false;
    if (onlyNotOwned && i.owned) return false;
    return true;
  });

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

      <div className="card p-4 mb-6 flex flex-wrap gap-2 items-center">
        <input className="input w-full sm:w-64" placeholder="Rechercher un cosmetique..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="input w-full sm:w-44" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
          <option value="ALL">Tous types</option>
          <option value="BORDER">Cadres</option>
          <option value="HAT">Chapeaux</option>
          <option value="BG">Fonds</option>
          <option value="APP_BG">Fonds d'application</option>
          <option value="BADGE">Badges</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={onlyNotOwned} onChange={(e) => setOnlyNotOwned(e.target.checked)} />
          Afficher seulement ceux non possedes
        </label>
      </div>

      {rotation && (
        <section className="card p-5 mb-8">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Rotation du jour</h3>
              <p className="text-xs text-zinc-500">Offres speciales, mise a jour chaque jour.</p>
            </div>
            <span className="pill-amber">Nouveaute</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rotation.listings.map((l) => {
              const it = l.cosmetic;
              const locked = !!user && user.level < it.requiredLevel;
              const out = l.stock !== null && l.sold >= l.stock;
              return (
                <div key={l.id} className={`rounded-2xl border p-4 ${rarityClass[it.rarity] || rarityClass.common}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{it.name}</div>
                    <span className="pill-violet text-[10px] uppercase">{it.type}</span>
                  </div>
                  {it.description && <p className="text-xs text-zinc-400 mt-1">{it.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-zinc-400">Niv. {it.requiredLevel}</div>
                    <div className="text-amber-300 font-semibold">{l.priceCoins} coins</div>
                  </div>
                  {l.stock !== null && (
                    <div className="text-[11px] text-zinc-500 mt-1">Stock: {Math.max(0, l.stock - l.sold)} restant</div>
                  )}
                  <div className="mt-3">
                    <button
                      className="btn-primary w-full"
                      disabled={!user || locked || out || busy === l.id || (user.coins < l.priceCoins)}
                      onClick={() => buyListing(l.id)}
                    >
                      {out ? "Epuise" : locked ? `Niv. ${it.requiredLevel} requis` : busy === l.id ? "..." : "Acheter (rotation)"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {([
        ["BORDER", "Cadres d'avatar"],
        ["HAT", "Chapeaux"],
        ["BG", "Fonds"],
        ["APP_BG", "Fonds d'application"],
        ["BADGE", "Badges"],
      ] as const).map(([key, title]) => (
        <section key={key} className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">{title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.filter((it) => it.type === key).map((it) => {
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
