/* eslint-disable @next/next/no-img-element */

import { getPublicPlayer } from "@/lib/data/public-player";
import { BrandMark } from "@/components/brand-mark";
import {
  BadgeCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { notFound } from "next/navigation";

type PublicPosition = {
  sport_format: "field" | "society" | "futsal";
  code: string;
  label: string;
  priority: number;
};

const formatLabels = { field: "Campo", society: "Society", futsal: "Futsal" };

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(handle)) notFound();

  const player = await getPublicPlayer(handle);
  if (!player?.handle || !player.display_name) notFound();
  const positions = Array.isArray(player.positions)
    ? (player.positions as unknown as PublicPosition[])
    : [];
  const statisticItems = [
    [player.statistics.matches_played, "Partidas"],
    [player.statistics.goals, "Gols"],
    [player.statistics.assists, "Assist."],
    [player.statistics.yellow_cards, "Amarelos"],
    [player.statistics.red_cards, "Vermelhos"],
  ] as const;

  return (
    <main className="min-h-svh bg-[#f5f4ef] pb-10 text-graphite">
      <header
        data-testid="public-player-header"
        className="relative overflow-hidden bg-grass px-5 pb-14 pt-5 text-white sm:pb-16 sm:pt-6"
      >
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative mx-auto max-w-xl">
          <BrandMark inverted />

          <div className="mt-7 flex items-center gap-4 sm:mt-10">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-emerald-100 shadow-md">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={`Foto de ${player.preferred_name || player.display_name}`}
                  className="size-full object-cover"
                />
              ) : (
                <UserRound className="size-9" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                Perfil público
              </p>
              <h1 className="mt-2 break-words text-3xl font-black leading-none tracking-[-0.05em] sm:text-5xl">
                {player.preferred_name || player.display_name}
              </h1>
              <p className="mt-2 break-all text-sm font-semibold text-slate-300">
                @{player.handle}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-900">
              <BadgeCheck className="size-4" aria-hidden />
              Verificado
            </span>
            {player.preferred_name ? (
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
                {player.display_name}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div
        data-testid="public-player-content"
        className="relative z-10 mx-auto -mt-8 max-w-xl space-y-4 px-4"
      >
        <section className="app-surface p-5">
          <p className="app-kicker">Sobre o atleta</p>
          <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-6 text-slate-700">
            {player.bio || "Este atleta ainda não adicionou uma apresentação."}
          </p>
          <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-emerald-700">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Informações publicadas pelo atleta
          </p>
        </section>

        <section
          className="app-surface overflow-hidden"
          aria-labelledby="player-statistics"
        >
          <div className="px-5 pb-3 pt-5">
            <p className="app-kicker">Desempenho</p>
            <h2 id="player-statistics" className="mt-1 text-lg font-black">
              Estatísticas
            </h2>
          </div>

          <div
            className="grid grid-cols-5 border-t border-slate-100"
            aria-label="Estatísticas em jogos encerrados"
          >
            {statisticItems.map(([value, label]) => (
              <div key={label} className="min-w-0 px-1 py-4 text-center">
                <p className="text-lg font-black leading-none text-slate-900">
                  {value}
                </p>
                <p className="mt-1.5 truncate text-[0.625rem] font-bold uppercase tracking-tight text-slate-400 sm:text-[0.6875rem]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-surface p-5">
          <div>
            <p className="app-kicker">Meu futebol</p>
            <h2 className="mt-1 text-lg font-black">Posições preferenciais</h2>
          </div>

          {positions.length ? (
            <div className="mt-4 space-y-5">
              {(["field", "society", "futsal"] as const).map((format) => {
                const items = positions
                  .filter((position) => position.sport_format === format)
                  .sort((a, b) => a.priority - b.priority);

                return items.length ? (
                  <div key={format}>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      {formatLabels[format]}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {items.map((position) => (
                        <span
                          key={position.code}
                          className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 ring-1 ring-emerald-100"
                        >
                          {position.priority}. {position.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Nenhuma posição publicada.
            </p>
          )}
        </section>

        <p className="px-3 pt-5 text-center text-xs leading-5 text-slate-500">
          Este perfil mostra somente as informações que o atleta escolheu
          publicar.
        </p>
      </div>
    </main>
  );
}
