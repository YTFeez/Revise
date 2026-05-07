import { RANKS, rankForLevel } from "@revise-plus/shared";

export function ProgressionGenerale({ level }: { level: number }) {
  const current = rankForLevel(level);
  return (
    <section className="card p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Progression generale</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {RANKS.slice(0, 5).map((r) => {
          const reached = level >= r.levelMin;
          const isCurrent = current.name === r.name;
          return (
            <div
              key={r.name}
              className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                isCurrent
                  ? "border-brand-400/60 bg-brand-500/10"
                  : reached
                    ? "border-bg-ring bg-bg-soft/60"
                    : "border-bg-ring bg-bg-card opacity-50"
              }`}
            >
              <div className={`text-[10px] uppercase tracking-wide ${reached ? "text-zinc-300" : "text-zinc-500"}`}>
                Niv. {r.levelMin}-{r.levelMax}
              </div>
              <div className={`mt-1 font-semibold text-sm ${reached ? r.textClass : "text-zinc-500"}`}>
                {r.name}
              </div>
              {reached && <div className="text-[10px] text-zinc-500 mt-0.5">{r.description}</div>}
            </div>
          );
        })}
      </div>
      {level > 60 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {RANKS.slice(5).map((r) => {
            const reached = level >= r.levelMin;
            const isCurrent = current.name === r.name;
            return (
              <div
                key={r.name}
                className={`rounded-xl border px-3 py-3 text-center ${
                  isCurrent
                    ? "border-brand-400/60 bg-brand-500/10"
                    : reached
                      ? "border-bg-ring bg-bg-soft/60"
                      : "border-bg-ring bg-bg-card opacity-50"
                }`}
              >
                <div className={`text-[10px] uppercase ${reached ? "text-zinc-300" : "text-zinc-500"}`}>Niv. {r.levelMin}-{r.levelMax}</div>
                <div className={`mt-1 font-semibold text-sm ${reached ? r.textClass : "text-zinc-500"}`}>{r.name}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
