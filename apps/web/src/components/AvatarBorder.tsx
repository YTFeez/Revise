import { rankForLevel } from "@revise-plus/shared";

interface Props {
  level: number;
  username: string;
  size?: number;
  borderClass?: string;
  showBadge?: boolean;
}

export function AvatarBorder({ level, username, size = 64, borderClass, showBadge = false }: Props) {
  const rank = rankForLevel(level);
  const initials = username.slice(0, 2).toUpperCase();
  const ring = borderClass || rank.borderClass;
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <div
        className={`relative rounded-full bg-bg-soft flex items-center justify-center text-zinc-200 font-semibold ${ring}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size / 3) }}
      >
        <span aria-hidden>{initials}</span>
      </div>
      {showBadge && (
        <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-bg-card border border-bg-ring ${rank.textClass}`}>
          Niv. {level}
        </span>
      )}
    </div>
  );
}
