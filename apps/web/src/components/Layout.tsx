import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../store/auth";
import { rankForLevel } from "@revise-plus/shared";
import { AvatarBorder } from "./AvatarBorder";
import { getSocket } from "../lib/socket";

function setBodyTheme(themeClass: string | null | undefined) {
  const themes = [
    "theme-nebula",
    "theme-synthwave",
    "theme-emerald-night",
    "theme-obsidian",
    "app-theme-classique-clair",
    "app-theme-nuit-profonde",
    "app-theme-foret",
    "app-theme-cosmos",
    "app-theme-coucher-soleil",
    "app-theme-sakura",
    "app-theme-ocean",
    "app-theme-tableau-noir",
  ];
  for (const t of themes) document.body.classList.remove(t);
  if (themeClass) document.body.classList.add(themeClass);
}

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/cours", label: "Cours" },
  { to: "/quiz", label: "Quiz" },
  { to: "/eval", label: "Eval" },
  { to: "/classement", label: "Classement" },
  { to: "/amis", label: "Amis" },
  { to: "/boutique", label: "Boutique" },
  { to: "/inventaire", label: "Inventaire" },
];

export default function Layout() {
  const { user, fetchMe, loaded, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) fetchMe();
  }, [loaded, fetchMe]);

  useEffect(() => {
    setBodyTheme(user?.equippedAppBgClass ?? null);
  }, [user?.equippedAppBgClass]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onLevelUp = (p: { userId: string; level: number; rankName: string; newRankName?: string }) => {
      if (p.userId !== user.id) return;
      // simple feedback (a remplacer par un toast plus tard)
      console.info(`Level up ! Niveau ${p.level} - ${p.rankName}`);
      fetchMe();
    };
    socket.on("user:levelup", onLevelUp);
    return () => {
      socket.off("user:levelup", onLevelUp);
    };
  }, [user, fetchMe]);

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 backdrop-blur bg-bg/70 border-b border-bg-ring/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-violet-500 text-white font-bold">R</span>
            <span className="text-lg font-extrabold tracking-tight">Revise<span className="text-brand-400">+</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium ${
                    isActive ? "bg-bg-soft text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-bg-soft/60"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            {user?.isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    isActive ? "bg-brand-500/15 text-white border border-brand-400/30" : "text-brand-200 hover:text-white hover:bg-brand-500/10"
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                {user.streakDays > 0 && (
                  <span className="pill-amber" title="Serie de jours">
                    <FlameIcon /> {user.streakDays} jours
                  </span>
                )}
                <span className="pill-violet">{user.coins} coins</span>
                <button
                  className="flex items-center gap-2 group"
                  onClick={() => navigate("/avatar")}
                  title="Mon profil"
                >
                  <AvatarBorder
                    level={user.level}
                    username={user.username}
                    size={36}
                    avatar={user.avatar ?? null}
                    borderClass={user.equippedBorderClass ?? undefined}
                    bgClass={user.equippedBgClass ?? undefined}
                  />
                  <span className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold">{user.username}</span>
                    <span className={`text-[11px] ${rankForLevel(user.level).textClass}`}>Niv. {user.level} - {rankForLevel(user.level).name}</span>
                  </span>
                </button>
                <button onClick={async () => { await logout(); navigate("/login"); }} className="btn-outline !py-1 !px-2 text-xs">Sortir</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Connexion</Link>
                <Link to="/register" className="btn-primary">Creer un compte</Link>
              </>
            )}
          </div>
        </div>
        <nav className="md:hidden mx-auto max-w-6xl px-4 pb-3 flex flex-wrap gap-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive ? "bg-bg-soft text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-bg-soft/60"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          {user?.isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  isActive ? "bg-brand-500/15 text-white border border-brand-400/30" : "text-brand-200 hover:text-white hover:bg-brand-500/10"
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-zinc-500">
        Revise+ -- plateforme de revision college. {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 22c-4 0-7-3-7-7 0-4 3-6 4-9 .3-.8 1-1 1.5-.6.5.3.7 1 .6 1.7 0 .8.6 1.4 1.4 1.4 1 0 1.7-1 1.4-2C13.7 5.3 14 4 15 3.5c.6-.3 1.2.1 1.2.7 0 1.3.5 2.4 1.4 3.4C19 9 20 10.7 20 13c0 5-3.6 9-8 9z" />
    </svg>
  );
}
