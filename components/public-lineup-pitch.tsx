import { buildVisualFormationRows } from "@/lib/features/team-division/visual-formation";

type PublicPitchSquad = {
  name: string;
  color: string | null;
  sort_order: number;
  athletes: Array<{ name: string; sort_order: number }>;
};

export function PublicLineupPitch({ squad }: { squad: PublicPitchSquad }) {
  const formation = buildVisualFormationRows(squad.athletes);

  return (
    <article
      className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-sm"
      style={{ borderTopColor: squad.color ?? "#0D9488", borderTopWidth: 5 }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="truncate text-lg font-black text-slate-900">{squad.name}</h2>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {squad.athletes.length} {squad.athletes.length === 1 ? "jogador" : "jogadores"}
        </span>
      </div>

      <div
        data-testid="public-lineup-pitch"
        className="relative mx-3 mb-3 min-h-64 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#18845f_0%,#0f694c_100%)] px-3 py-5 shadow-inner"
        aria-label={`Formação visual do ${squad.name}`}
      >
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/45" aria-hidden />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-white/45" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" aria-hidden />
        <div className="pointer-events-none absolute left-1/4 right-1/4 top-3 h-9 rounded-b-lg border border-t-0 border-white/40" aria-hidden />
        <div className="pointer-events-none absolute bottom-3 left-1/4 right-1/4 h-9 rounded-t-lg border border-b-0 border-white/40" aria-hidden />

        {formation.length > 0 ? (
          <div className="relative z-10 flex min-h-56 flex-col justify-around gap-3">
            {formation.map((row, rowIndex) => (
              <ol
                key={`${squad.sort_order}:row:${rowIndex}`}
                className="flex items-center justify-center gap-1.5"
              >
                {row.map((athlete) => (
                  <li
                    key={`${athlete.sort_order}:${athlete.name}`}
                    className="min-w-0 max-w-24 flex-1 truncate rounded-full border border-white/70 bg-white/95 px-2 py-1.5 text-center text-[11px] font-black text-emerald-950 shadow-md"
                    title={athlete.name}
                  >
                    {athlete.name}
                  </li>
                ))}
              </ol>
            ))}
          </div>
        ) : (
          <p className="relative z-10 grid min-h-56 place-items-center text-sm font-bold text-white/80">
            Nenhum jogador escalado.
          </p>
        )}

        <span className="sr-only">Distribuição visual pela ordem da escalação, sem indicar posição real.</span>
      </div>
    </article>
  );
}
