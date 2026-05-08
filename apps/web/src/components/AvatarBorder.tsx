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
  const useSvgRankFrame = !borderClass && ring.startsWith("rank-frame-svg");
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      {useSvgRankFrame && (
        <RankFrameSvg variant={ring.split(" ").find((c) => c.startsWith("rank-frame-"))?.replace("rank-frame-", "") ?? "recrue"} size={size} />
      )}
      <div
        className={`relative rounded-full bg-bg-soft flex items-center justify-center text-zinc-200 font-semibold ${bgClass || ""} ${useSvgRankFrame ? "" : ring}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size / 3) }}
      >
        {avatar ? (
          <AvatarSvg size={Math.max(16, size - (useSvgRankFrame ? 44 : 12))} avatar={avatar} />
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

function RankFrameSvg({ variant, size }: { variant: string; size: number }) {
  const s = size;
  const common = { cx: 50, cy: 50 };
  const strokeLinecap: any = "round";

  // Couleurs et motifs reprennent exactement tes SVG.
  switch (variant) {
    case "apprenti":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#E6F1FB" stroke="#85B7EB" strokeWidth="4" />
          <circle {...common} r="38" fill="#E6F1FB" stroke="#B5D4F4" strokeWidth="1.5" />
          <circle cx="50" cy="8" r="5" fill="#85B7EB" />
          <circle cx="50" cy="92" r="5" fill="#85B7EB" />
          <circle cx="8" cy="50" r="5" fill="#85B7EB" />
          <circle cx="92" cy="50" r="5" fill="#85B7EB" />
        </svg>
      );
    case "eleve":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#EAF3DE" stroke="#97C459" strokeWidth="4.5" />
          <circle {...common} r="38" fill="#EAF3DE" stroke="#C0DD97" strokeWidth="1.5" />
          <line x1="50" y1="4" x2="50" y2="14" stroke="#97C459" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
          <line x1="50" y1="86" x2="50" y2="96" stroke="#97C459" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
          <line x1="4" y1="50" x2="14" y2="50" stroke="#97C459" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
          <line x1="86" y1="50" x2="96" y2="50" stroke="#97C459" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
          <line x1="21" y1="21" x2="29" y2="29" stroke="#97C459" strokeWidth="2" strokeLinecap={strokeLinecap} />
          <line x1="71" y1="71" x2="79" y2="79" stroke="#97C459" strokeWidth="2" strokeLinecap={strokeLinecap} />
          <line x1="79" y1="21" x2="71" y2="29" stroke="#97C459" strokeWidth="2" strokeLinecap={strokeLinecap} />
          <line x1="21" y1="79" x2="29" y2="71" stroke="#97C459" strokeWidth="2" strokeLinecap={strokeLinecap} />
        </svg>
      );
    case "curieux":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#EEEDFE" stroke="#7F77DD" strokeWidth="5" />
          <circle {...common} r="38" fill="#EEEDFE" stroke="#AFA9EC" strokeWidth="1.5" />
          <polygon points="50,4 53,14 63,14 55,21 58,31 50,25 42,31 45,21 37,14 47,14" fill="#7F77DD" />
        </svg>
      );
    case "chercheur":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#FAEEDA" stroke="#EF9F27" strokeWidth="5" />
          <circle {...common} r="39" fill="#FAEEDA" stroke="#FAC775" strokeWidth="1.5" />
          <circle {...common} r="33" fill="#FAEEDA" stroke="#EF9F27" strokeWidth="1" strokeDasharray="4 3" />
        </svg>
      );
    case "expert":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#FAECE7" stroke="#D85A30" strokeWidth="5.5" />
          <circle {...common} r="38" fill="#FAECE7" stroke="#F0997B" strokeWidth="2" />
          <path d="M50 4 L54 16 L50 12 L46 16 Z" fill="#D85A30" />
          <path d="M50 96 L54 84 L50 88 L46 84 Z" fill="#D85A30" />
          <path d="M4 50 L16 46 L12 50 L16 54 Z" fill="#D85A30" />
          <path d="M96 50 L84 46 L88 50 L84 54 Z" fill="#D85A30" />
        </svg>
      );
    case "maitre":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#EEEDFE" stroke="#534AB7" strokeWidth="6" />
          <circle {...common} r="38" fill="#EEEDFE" stroke="#7F77DD" strokeWidth="2" />
          <circle {...common} r="32" fill="#EEEDFE" stroke="#AFA9EC" strokeWidth="1.5" />
          <polygon points="50,5 52,13 60,13 54,18 56,26 50,21 44,26 46,18 40,13 48,13" fill="#534AB7" />
          <polygon points="50,74 52,82 60,82 54,87 56,95 50,90 44,95 46,87 40,82 48,82" fill="#534AB7" />
        </svg>
      );
    case "savant":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#E1F5EE" stroke="#1D9E75" strokeWidth="6.5" />
          <circle {...common} r="38" fill="#E1F5EE" stroke="#5DCAA5" strokeWidth="2.5" />
          <circle {...common} r="30" fill="#E1F5EE" stroke="#1D9E75" strokeWidth="1.5" />
          <line x1="50" y1="4" x2="50" y2="20" stroke="#1D9E75" strokeWidth="3" strokeLinecap={strokeLinecap} />
          <line x1="50" y1="80" x2="50" y2="96" stroke="#1D9E75" strokeWidth="3" strokeLinecap={strokeLinecap} />
          <line x1="4" y1="50" x2="20" y2="50" stroke="#1D9E75" strokeWidth="3" strokeLinecap={strokeLinecap} />
          <line x1="80" y1="50" x2="96" y2="50" stroke="#1D9E75" strokeWidth="3" strokeLinecap={strokeLinecap} />
          <line x1="18" y1="18" x2="30" y2="30" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
          <line x1="70" y1="70" x2="82" y2="82" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
          <line x1="82" y1="18" x2="70" y2="30" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
          <line x1="18" y1="82" x2="30" y2="70" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap={strokeLinecap} />
        </svg>
      );
    case "genie":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#FAEEDA" stroke="#BA7517" strokeWidth="7" />
          <circle {...common} r="37" fill="#FAEEDA" stroke="#EF9F27" strokeWidth="2.5" />
          <circle {...common} r="29" fill="#FAEEDA" stroke="#FAC775" strokeWidth="2" />
          <polygon points="50,4 52,12 60,12 54,17 56,25 50,20 44,25 46,17 40,12 48,12" fill="#BA7517" />
          <polygon points="50,96 52,88 60,88 54,83 56,75 50,80 44,75 46,83 40,88 48,88" fill="#BA7517" />
          <polygon points="4,50 12,48 12,56 17,50 25,44 20,50 25,56 17,50 12,56 12,48" fill="#BA7517" />
          <polygon points="96,50 88,48 88,56 83,50 75,44 80,50 75,56 83,50 88,56 88,48" fill="#BA7517" />
        </svg>
      );
    case "legendaire":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#FCEBEB" stroke="#E24B4A" strokeWidth="7.5" />
          <circle {...common} r="37" fill="#FCEBEB" stroke="#F09595" strokeWidth="3" />
          <circle {...common} r="29" fill="#FCEBEB" stroke="#E24B4A" strokeWidth="2" />
          <circle {...common} r="22" fill="#FCEBEB" stroke="#F7C1C1" strokeWidth="1.5" />
          <polygon points="50,4 52,12 60,12 54,17 56,25 50,20 44,25 46,17 40,12 48,12" fill="#E24B4A" />
          <polygon points="50,96 52,88 60,88 54,83 56,75 50,80 44,75 46,83 40,88 48,88" fill="#E24B4A" />
          <polygon points="4,50 16,47 16,53 21,50" fill="#E24B4A" />
          <polygon points="96,50 84,47 84,53 79,50" fill="#E24B4A" />
          <polygon points="18,18 26,24 22,28 28,22" fill="#E24B4A" />
          <polygon points="82,18 74,24 78,28 72,22" fill="#E24B4A" />
          <polygon points="18,82 26,76 22,72 28,78" fill="#E24B4A" />
          <polygon points="82,82 74,76 78,72 72,78" fill="#E24B4A" />
        </svg>
      );
    case "recrue":
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
          <circle {...common} r="46" fill="#F1EFE8" stroke="#B4B2A9" strokeWidth="4" />
          <circle {...common} r="38" fill="#F1EFE8" stroke="#D3D1C7" strokeWidth="1.5" />
        </svg>
      );
  }
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
