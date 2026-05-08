import { rankForLevel, levelFromTotalXp, xpForNextLevel } from "@revise-plus/shared";
import type { PublicUser } from "@revise-plus/shared";
import { AvatarBorder } from "./AvatarBorder";

export function ProfileCard({ user }: { user: PublicUser }) {
  const rank = rankForLevel(user.level);
  const { xpInLevel, xpForNext, progressPct } = levelFromTotalXp(user.totalXp);
  const xpNeeded = Math.max(0, xpForNextLevel(user.level) - xpInLevel);
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

  return (
    <div className={`card p-5 relative overflow-hidden banner-bg ${bannerClass}`}>
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div className="flex items-center gap-4">
        <AvatarBorder
          level={user.level}
          username={user.username}
          size={72}
          showBadge
          avatar={user.avatar ?? null}
          borderClass={user.equippedBorderClass ?? undefined}
          bgClass={user.equippedBgClass ?? undefined}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold truncate">{user.username}</h2>
            <span className={`text-sm font-semibold ${rank.textClass}`}>{rank.name}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {user.gradeLevel ?? "College"} - Niveau {user.level}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-brand-300 leading-none">{user.totalXp.toLocaleString("fr-FR")}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">XP total</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <span>Niveau {user.level}</span>
          <span>{xpInLevel} / {xpForNext} XP</span>
        </div>
        <div className="bar"><span style={{ width: `${progressPct}%` }} /></div>
        <p className="text-xs text-zinc-500 mt-1">
          Encore <span className="text-zinc-200 font-medium">{xpNeeded} XP</span> avant le niveau {user.level + 1}.
        </p>
      </div>
    </div>
  );
}
