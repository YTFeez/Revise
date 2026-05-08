import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { AvatarBorder } from "../components/AvatarBorder";
import { rankForLevel, RANKS } from "@revise-plus/shared";
import type { PublicUser } from "@revise-plus/shared";
import type { AvatarConfig, AvatarBase } from "@revise-plus/shared";

interface OwnedCosmetic {
  id: string;
  equipped: boolean;
  cosmetic: { id: string; slug: string; name: string; type: "BORDER" | "HAT" | "BG" | "BADGE"; borderClass?: string };
}

export default function AvatarPage() {
  const { user, setUser, fetchMe } = useAuth();
  const [owned, setOwned] = useState<OwnedCosmetic[]>([]);
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState<AvatarConfig>(() => user?.avatar ?? { base: "sumo", skin: "#f2c4a7", primary: "#6b6ee8", secondary: "#a78bfa" });

  useEffect(() => {
    api<OwnedCosmetic[]>("/me/cosmetics").then(setOwned).catch(() => undefined);
  }, []);

  if (!user) return null;
  const rank = rankForLevel(user.level);
  const bannerClass =
    user.level >= 1000 ? "banner-legendaire" :
    user.level >= 901 ? "banner-genie" :
    user.level >= 801 ? "banner-savant" :
    user.level >= 701 ? "banner-maitre" :
    user.level >= 551 ? "banner-expert" :
    user.level >= 451 ? "banner-chercheur" :
    user.level >= 301 ? "banner-curieux" :
    user.level >= 151 ? "banner-eleve" :
    user.level >= 51 ? "banner-apprenti" :
    "banner-recrue";

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

  async function saveAvatar() {
    setBusy(true);
    try {
      const data = await api<{ user: PublicUser }>("/me/avatar", {
        method: "PUT",
        body: JSON.stringify(avatar),
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

      <div className={`card p-6 flex flex-col items-center gap-3 relative overflow-hidden banner-bg ${bannerClass}`}>
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <AvatarBorder
          level={user.level}
          username={user.username}
          size={120}
          showBadge
          avatar={avatar}
          borderClass={user.equippedBorderClass ?? undefined}
          bgClass={user.equippedBgClass ?? undefined}
        />
        <div className="text-lg font-semibold">{user.username}</div>
        <div className={`text-sm ${rank.textClass}`}>Niv. {user.level} - {rank.name}</div>
      </div>

      <section className="card p-5 mt-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Cree ton Reviseur (avatar)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block">
              <div className="text-xs text-zinc-400 mb-1">Style</div>
              <select className="input" value={avatar.base} onChange={(e) => setAvatar((a) => ({ ...a, base: e.target.value as AvatarBase }))}>
                <option value="sumo">Sumo</option>
                <option value="ninja">Ninja</option>
                <option value="mage">Mage</option>
                <option value="robot">Robot</option>
                <option value="alien">Alien</option>
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <ColorPick label="Peau" value={avatar.skin} onChange={(v) => setAvatar((a) => ({ ...a, skin: v }))} />
              <ColorPick label="Couleur 1" value={avatar.primary} onChange={(v) => setAvatar((a) => ({ ...a, primary: v }))} />
              <ColorPick label="Couleur 2" value={avatar.secondary} onChange={(v) => setAvatar((a) => ({ ...a, secondary: v }))} />
            </div>
            <button className="btn-primary" onClick={saveAvatar} disabled={busy}>Sauvegarder mon avatar</button>
          </div>
          <div className="rounded-2xl border border-bg-ring bg-bg-soft p-4">
            <div className="text-xs text-zinc-400 mb-2">Apercu</div>
            <div className="flex items-center gap-4">
              <AvatarBorder
                level={user.level}
                username={user.username}
                size={96}
                avatar={avatar}
                showBadge
                borderClass={user.equippedBorderClass ?? undefined}
                bgClass={user.equippedBgClass ?? undefined}
              />
              <div>
                <div className="font-semibold">Cadre: {rank.name}</div>
                <div className="text-xs text-zinc-400">Tu peux equiper un cadre special plus bas.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[11px] text-zinc-500 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded-lg border border-bg-ring bg-bg-soft" />
        <input className="input h-9" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}
