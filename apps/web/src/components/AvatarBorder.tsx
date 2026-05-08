import { rankForLevel } from "@revise-plus/shared";
import type { AvatarConfig } from "@revise-plus/shared";

interface Props {
  level: number;
  username: string;
  size?: number;
  borderClass?: string;
  bgClass?: string;
  showBadge?: boolean;
  avatar?: AvatarConfig | null;
}

export function AvatarBorder({ level, username, size = 64, borderClass, bgClass, showBadge = false, avatar }: Props) {
  const rank = rankForLevel(level);
  const initials = username.slice(0, 2).toUpperCase();
  const ring = borderClass || rank.borderClass;
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <div
        className={`relative rounded-full bg-bg-soft flex items-center justify-center text-zinc-200 font-semibold ${bgClass || ""} ${ring}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size / 3) }}
      >
        {avatar ? (
          <AvatarSvg size={size - 12} avatar={avatar} />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </div>
      {showBadge && (
        <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-bg-card border border-bg-ring ${rank.textClass}`}>
          Niv. {level}
        </span>
      )}
    </div>
  );
}

function AvatarSvg({ size, avatar }: { size: number; avatar: AvatarConfig }) {
  const s = size;
  const skin = avatar.skin;
  const p = avatar.primary;
  const q = avatar.secondary;
  const face = (
    <circle cx="50" cy="44" r="22" fill={skin} />
  );
  const eyes = (
    <>
      <circle cx="42" cy="44" r="3" fill="#0b0d12" />
      <circle cx="58" cy="44" r="3" fill="#0b0d12" />
    </>
  );
  const mouth = <path d="M43 56c4 4 10 4 14 0" stroke="#0b0d12" strokeWidth="3" strokeLinecap="round" fill="none" />;
  const hat =
    avatar.base === "ninja" ? <path d="M25 38c10-18 40-18 50 0v10H25z" fill={p} /> :
    avatar.base === "mage" ? <path d="M50 10L25 40h50z" fill={p} /> :
    avatar.base === "robot" ? <rect x="28" y="22" width="44" height="18" rx="6" fill={p} /> :
    avatar.base === "alien" ? <path d="M30 36c6-18 34-18 40 0" fill={p} /> :
    <path d="M30 34c8-12 32-12 40 0" fill={p} />;
  const body =
    <path d="M22 92c6-20 18-28 28-28s22 8 28 28" fill={q} opacity="0.95" />;

  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden>
      <g>
        {hat}
        {face}
        {eyes}
        {mouth}
        {body}
      </g>
    </svg>
  );
}
