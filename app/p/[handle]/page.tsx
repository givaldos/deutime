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
    <main className="min-h-svh bg-[#f7f7f4] pb-10 text-graphite">
      <header className="relative h-36 overflow-hidden bg-grass px-5 pt-6 text-white sm:h-40">
        <div className="pointer-events-none absolute -right-20 -top-28 size-64 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-10 size-56 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative mx-auto max-w-xl">
          <BrandMark inverted />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4">
        <section className="-mt-14 rounded-[1.75rem] border border-slate-200/80 bg-white px-5 pb-1 shadow-[0_18px_50px_-34px_rgba(7,35,24,.55)]">
          <div className="flex items-end justify-between gap-4">
            <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-emerald-50 text-emerald-800 shadow-md">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={`Foto de ${player.preferred_name || player.display_name}`}
                  className="size-full object-cover"
                />
              ) : (
                <UserRound className="size-11" aria-hidden />
              )}
            </div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <BadgeCheck className="size-4" aria-hidden />
              Verificado
            </div>
          </div>

          <div className="pb-5 pt-4">
            <h1 className="break-words text-3xl font-black leading-none tracking-[-0.045em] sm:text-4xl">
              {player.preferred_name || player.display_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium text-slate-500">
                @{player.handle}
              </span>
              {player.preferred_name ? (
                <>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                  <span className="text-slate-600">{player.display_name}</span>
                </>
              ) : null}
            </div>

            <p className="mt-4 whitespace-pre-wrap text-[0.9375rem] leading-6 text-slate-700">
              {player.bio ||
                "Este atleta ainda não adicionou uma apresentação."}
            </p>

            <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="size-4 shrink-0" aria-hidden />
              Informações publicadas pelo atleta
            </p>
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

        <section className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_-30px_rgba(7,35,24,.5)]">
          <div>
            <p className="text-[0.6875rem] font-black uppercase tracking-[0.16em] text-emerald-700">
              Meu futebol
            </p>
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
