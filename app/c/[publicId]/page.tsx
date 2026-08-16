/* eslint-disable @next/next/no-img-element -- URLs assinadas seguem o padrão da página pública do time. */

import { BrandMark } from "@/components/brand-mark";
import { ChampionshipShareButton } from "@/components/championship-public-controls";
import { InternalSquadBadge } from "@/components/internal-squad-badge";
import {
  getPublicChampionshipOrganizer,
  getPublicChampionshipWithFallback,
  type PublicChampionshipFixture,
  type PublicChampionshipStanding,
} from "@/lib/data/public-championship";
import { getAppUrl } from "@/lib/env/server";
import {
  championshipFormatLabels,
  championshipTiebreakLabels,
} from "@/lib/features/championships/rules";
import { BadgeCheck, CalendarDays, ExternalLink, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PublicChampionshipPageProps = {
  params: Promise<{ publicId: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const robots = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
} as const;

const statusLabels = {
  published: "Publicado",
  active: "Em andamento",
  completed: "Encerrado",
} as const;

const resolutionLabels = {
  score: "Placar",
  penalties: "Pênaltis",
  walkover: "W.O.",
  regulation: "Regulamento",
  administrative: "Decisão administrativa",
} as const;

export async function generateMetadata({
  params,
}: PublicChampionshipPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const state = await getPublicChampionshipWithFallback(publicId);
  if (!state) {
    return {
      title: "Campeonato não encontrado",
      description: "Este campeonato não está disponível.",
      robots,
    };
  }

  const { championship, participants } = state;
  const title = `${championship.name} — DeuTime`;
  const description = `${championshipFormatLabels[championship.format]} com ${participants.length} equipes. Acompanhe classificação e confrontos atualizados pelas súmulas.`;
  const canonicalPath = `/c/${championship.public_id}`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "DeuTime",
      title,
      description,
      url: canonicalPath,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicChampionshipPage({
  params,
}: PublicChampionshipPageProps) {
  const { publicId } = await params;
  const [state, organizer] = await Promise.all([
    getPublicChampionshipWithFallback(publicId),
    getPublicChampionshipOrganizer(publicId),
  ]);
  if (!state) notFound();

  const { championship, participants, standings, fixtures } = state;
  const publicUrl = new URL(`/c/${championship.public_id}`, getAppUrl()).toString();
  const participantBySeed = new Map(participants.map((participant) => [participant.seed, participant]));
  const fixtureGroups = groupFixtures(fixtures);

  return (
    <main className="min-h-svh bg-[#f5f4ef] pb-12 text-graphite">
      <header className="relative min-h-[34rem] overflow-hidden bg-grass text-white sm:min-h-[38rem]">
        {organizer?.cover_url ? (
          <img
            src={organizer.cover_url}
            alt={`Capa do ${organizer.name}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(16,185,129,.32),transparent_40%),radial-gradient(circle_at_10%_90%,rgba(14,165,233,.18),transparent_35%),linear-gradient(145deg,#020617,#052e24)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/40 to-slate-950" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="relative mx-auto flex min-h-[34rem] max-w-3xl flex-col px-5 pb-16 pt-5 sm:min-h-[38rem] sm:px-8 sm:pb-20 sm:pt-6">
          <div className="flex flex-nowrap items-center justify-between gap-3">
            <span className="sm:hidden"><BrandMark compact /></span>
            <span className="hidden sm:inline-flex"><BrandMark inverted /></span>
            <span className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-grass/35 px-4 text-xs font-black text-white shadow-lg backdrop-blur-md">
              <Trophy className="size-4 text-emerald-300" aria-hidden />
              {statusLabels[championship.status]}
            </span>
          </div>

          <div className="mt-auto">
            {organizer ? (
              <Link href={`/t/${organizer.slug}`} className="group inline-flex max-w-full items-center gap-3 rounded-2xl pr-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime/40">
                <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[1.4rem] border-4 border-white/15 bg-white/10 text-2xl font-black shadow-2xl backdrop-blur sm:size-24">
                  {organizer.logo_url ? (
                    <img src={organizer.logo_url} alt={`Escudo do ${organizer.name}`} className="size-full object-cover" />
                  ) : (
                    organizer.name.slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-emerald-300">
                    <BadgeCheck className="size-4 shrink-0" aria-hidden />
                    <span className="text-[11px] font-black uppercase tracking-[0.16em]">Página oficial</span>
                  </span>
                  <span className="mt-1 block break-words text-xl font-black leading-tight text-white group-hover:text-emerald-100 sm:text-2xl">{organizer.name}</span>
                </span>
              </Link>
            ) : null}

            <p className={`${organizer ? "mt-6" : "mt-8"} text-xs font-black uppercase tracking-[0.18em] text-volt`}>{championshipFormatLabels[championship.format]}</p>
            <h1 className="mt-2 break-words text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-5xl">{championship.name}</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Tabela e chave derivadas das súmulas. Placar e link da partida aparecem somente quando a organização já os publicou.</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {[[participants.length, "Equipes"], [fixtures.length, "Jogos"], [fixtures.filter((fixture) => fixture.status === "finalized" || fixture.status === "void").length, "Resolvidos"]].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"><p className="text-lg font-black text-white">{value}</p><p className="mt-0.5 text-[10px] font-bold text-slate-300">{label}</p></div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-8 max-w-3xl space-y-6 px-4 sm:px-5">
        <section className="app-surface p-5 sm:p-6" aria-labelledby="rules-title">
          <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="size-5" aria-hidden /></span><div><p className="app-kicker">Regulamento publicado</p><h2 id="rules-title" className="mt-1 text-xl font-black">Como vale</h2></div></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[[championship.win_points, "Vitória"], [championship.draw_points, "Empate"], [championship.loss_points, "Derrota"]].map(([value, label]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="font-black">{value} pt</p><p className="mt-1 text-[10px] font-bold text-slate-500">{label}</p></div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Desempates: {championship.tiebreak_order.map((key) => championshipTiebreakLabels[key]).join(" · ")}{championship.group_count ? ` · ${championship.group_count} grupos · ${championship.qualifiers_per_group} por grupo` : ""}</p>
        </section>

        <section aria-labelledby="participants-title">
          <div className="flex items-end justify-between"><div><p className="app-kicker">Identidade da competição</p><h2 id="participants-title" className="mt-1 text-xl font-black">Equipes</h2></div><UsersRound className="size-5 text-slate-400" aria-hidden /></div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {participants.map((participant) => (
              <article key={participant.seed} className={`app-surface min-w-0 p-4 text-center ${participant.status === "withdrawn" ? "opacity-60" : ""}`}>
                <InternalSquadBadge badgeKey={participant.badge_key} color={participant.color} className="mx-auto size-11" />
                <p className="mt-2 truncate text-sm font-black">{participant.name}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-400">Seed #{participant.seed}{participant.group_number ? ` · Grupo ${String.fromCharCode(64 + participant.group_number)}` : ""}</p>
                {participant.status === "withdrawn" ? <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">Retirado</span> : null}
              </article>
            ))}
          </div>
        </section>

        {championship.format === "league" && standings.length ? <PublicStandings title="Classificação" standings={standings} /> : null}
        {championship.format === "groups_knockout" && standings.length ? (
          <section aria-labelledby="groups-title"><div><p className="app-kicker">Fase de grupos</p><h2 id="groups-title" className="mt-1 text-xl font-black">Classificação</h2></div><div className="mt-3 space-y-4">{Array.from({ length: championship.group_count ?? 0 }, (_, index) => { const groupNumber = index + 1; return <PublicStandings key={groupNumber} title={`Grupo ${String.fromCharCode(64 + groupNumber)}`} standings={standings.filter((standing) => standing.group_number === groupNumber)} />; })}</div></section>
        ) : null}

        <section aria-labelledby="fixtures-title">
          <div className="flex items-end justify-between"><div><p className="app-kicker">Tabela oficial</p><h2 id="fixtures-title" className="mt-1 text-xl font-black">Confrontos</h2></div><CalendarDays className="size-5 text-slate-400" aria-hidden /></div>
          <div className="mt-3 space-y-5">
            {fixtureGroups.map(({ key, title, fixtures: roundFixtures }) => (
              <section key={key} className="space-y-2" aria-label={title}>
                <h3 className="px-1 text-xs font-black uppercase tracking-wider text-slate-500">{title}</h3>
                {roundFixtures.map((fixture) => {
                  const winner = fixture.winner_seed ? participantBySeed.get(fixture.winner_seed) : null;
                  return <article key={`${fixture.stage}-${fixture.group_number ?? 0}-${fixture.round_number}-${fixture.ordinal}`} className="app-surface p-4 sm:p-5">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                      <FixtureSide side={fixture.side_one} kind={fixture.side_one_kind} />
                      <div className="min-w-10"><p className="text-lg font-black text-slate-700">{fixture.score_one !== null ? `${fixture.score_one} × ${fixture.score_two}` : "×"}</p><p className="text-[10px] font-bold text-slate-400">{fixture.score_one !== null ? "Placar" : "Aguardando"}</p></div>
                      <FixtureSide side={fixture.side_two} kind={fixture.side_two_kind} />
                    </div>
                    {winner ? <p className="mt-3 rounded-xl bg-violet-50 p-3 text-center text-xs font-black text-violet-900">Avança: {winner.name}{fixture.resolution ? ` · ${resolutionLabels[fixture.resolution]}` : ""}</p> : null}
                    {fixture.status === "void" ? <p className="mt-3 text-center text-xs font-black text-slate-500">Confronto anulado</p> : null}
                    {fixture.event_public_id ? <Link href={`/e/${fixture.event_public_id}`} className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-black text-emerald-900">Abrir página da partida <ExternalLink className="size-4" aria-hidden /></Link> : null}
                  </article>;
                })}
              </section>
            ))}
          </div>
        </section>

        <section className="app-surface p-5 sm:p-6" aria-labelledby="share-title">
          <p className="app-kicker">WhatsApp-first</p><h2 id="share-title" className="mt-1 text-xl font-black">Leve a tabela para a galera</h2><p className="mt-1 text-sm leading-6 text-slate-500">Compartilhe a mesma URL. Ela acompanha as próximas súmulas sem expor atletas ou endereço.</p>
          <div className="mt-4"><ChampionshipShareButton publicUrl={publicUrl} championshipName={championship.name} /></div>
        </section>

        <footer className="px-4 text-center text-xs leading-5 text-slate-500"><p>Esta página não aparece em buscadores e não amplia a privacidade das partidas.</p><BrandMark compact className="mx-auto mt-3 justify-center opacity-70" /></footer>
      </div>
    </main>
  );
}

function FixtureSide({ side, kind }: { side: PublicChampionshipFixture["side_one"]; kind: PublicChampionshipFixture["side_one_kind"] }) {
  const label = side?.name ?? (kind === "bye" ? "Bye" : "A definir");
  return <div className="min-w-0">{side ? <InternalSquadBadge badgeKey={side.badge_key} color={side.color} className="mx-auto size-11" /> : <span aria-hidden className="mx-auto grid size-11 place-items-center rounded-full border border-dashed border-slate-300 text-xs font-black text-slate-400">?</span>}<p className="mt-2 truncate text-sm font-black">{label}</p></div>;
}

function PublicStandings({ title, standings }: { title: string; standings: PublicChampionshipStanding[] }) {
  return <section className="app-surface overflow-hidden" aria-label={title}><div className="p-5"><h3 className="text-lg font-black">{title}</h3><p className="mt-1 text-xs text-slate-500">Atualizada pelas súmulas encerradas.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left">#</th><th className="px-2 py-3 text-left">Equipe</th><th className="px-2 py-3 text-center">P</th><th className="px-2 py-3 text-center">J</th><th className="px-2 py-3 text-center">V</th><th className="px-2 py-3 text-center">E</th><th className="px-2 py-3 text-center">D</th><th className="px-2 py-3 text-center">GP</th><th className="px-2 py-3 text-center">GC</th><th className="px-4 py-3 text-center">SG</th></tr></thead><tbody className="divide-y divide-slate-100">{standings.map((standing) => <tr key={standing.seed}><td className="px-4 py-3 font-black text-emerald-700">{standing.rank_position}</td><td className="px-2 py-3"><span className="flex items-center gap-2"><InternalSquadBadge badgeKey={standing.badge_key} color={standing.color} className="size-8 shrink-0" /><span className="font-black">{standing.name}</span></span></td>{[standing.points, standing.played, standing.wins, standing.draws, standing.losses, standing.goals_for, standing.goals_against, standing.goal_difference].map((value, index) => <td key={index} className={`px-2 py-3 text-center ${index === 0 ? "font-black" : "text-slate-600"}`}>{value}</td>)}</tr>)}</tbody></table></div></section>;
}

function groupFixtures(fixtures: PublicChampionshipFixture[]) {
  const groups = new Map<string, PublicChampionshipFixture[]>();
  for (const fixture of fixtures) {
    const key = `${fixture.stage}:${fixture.group_number ?? 0}:${fixture.round_number}`;
    groups.set(key, [...(groups.get(key) ?? []), fixture]);
  }
  return Array.from(groups.entries()).map(([key, grouped]) => {
    const fixture = grouped[0]!;
    const title = fixture.stage === "group"
      ? `Grupo ${String.fromCharCode(64 + (fixture.group_number ?? 1))} · rodada ${fixture.round_number}`
      : fixture.stage === "knockout"
        ? `Mata-mata · fase ${fixture.round_number}`
        : `Rodada ${fixture.round_number}`;
    return { key, title, fixtures: grouped };
  });
}
