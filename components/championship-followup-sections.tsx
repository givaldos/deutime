import {
  ChampionshipFollowupShell,
  type ChampionshipIdentity,
} from "@/components/championship-followup-summary";
import {
  KnockoutResolutionForm,
  GroupAdvanceControl,
  LinkFixtureForm,
  QualifierDecisionForm,
  ReleaseFixtureForm,
  WithdrawParticipantForm,
} from "@/components/championship-forms";
import { InternalSquadBadge } from "@/components/internal-squad-badge";
import type {
  ChampionshipFollowupFixturePage,
  ChampionshipFollowupParticipant,
  ChampionshipFollowupStanding,
} from "@/lib/data/championship-followup";
import { encodeChampionshipFollowupCursor } from "@/lib/data/championship-followup";
import { buildChampionshipFollowupUrl } from "@/lib/navigation/championship-followup";
import { CalendarDays, ChevronRight, CircleAlert, Filter } from "lucide-react";
import Link from "next/link";

type BaseProps = {
  teamSlug: string;
  timeZone: string;
  returnTo: string | null;
  championship: ChampionshipIdentity;
};

export type MatchFilters = {
  stage: "league" | "group" | "knockout" | null;
  groupNumber: number | null;
  roundNumber: number | null;
  view: "upcoming" | "completed" | "unscheduled" | "all";
};

export type MatchActionContext = {
  fixtureId: string;
  stage: "league" | "group" | "knockout";
  fixtureStatus: "draft" | "scheduled" | "finalized" | "void";
  matchStatus: string | null;
  canRelease: boolean;
  currentWinnerId: string | null;
  sides: { id: string; name: string }[];
  matches: { id: string; eventTitle: string; ordinal: number; sideLabels: [string, string] }[];
};

export type ChampionshipAdvanceContext = {
  groupsClosed: boolean;
  pendingDecisions: {
    groupNumber: number;
    qualifierPosition: number;
    candidates: { id: string; name: string }[];
  }[];
};

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function ChampionshipMatchesView({
  teamId, teamSlug, timeZone, returnTo, championship, page, filters, canOperate, actionContext,
}: BaseProps & { teamId: string; page: ChampionshipFollowupFixturePage; filters: MatchFilters; canOperate: boolean; actionContext: MatchActionContext | null }) {
  const basePath = `/app/${teamSlug}/championships/${championship.id}`;
  const extras = {
    stage: filters.stage,
    group: filters.groupNumber,
    round: filters.roundNumber,
    view: filters.view === "all" ? null : filters.view,
  };
  return (
    <ChampionshipFollowupShell teamSlug={teamSlug} returnTo={returnTo} championship={championship} currentSection="matches">
      <section aria-labelledby="matches-title">
        <div><p className="app-kicker">Agenda do campeonato</p><h2 id="matches-title" className="mt-1 text-2xl font-black text-graphite">Jogos</h2><p className="mt-1 text-sm text-slate-500">{page.filtered_count} confronto{page.filtered_count === 1 ? "" : "s"} com estes filtros.</p></div>
        <form action={basePath} method="get" className="app-surface mt-4 p-4">
          <input type="hidden" name="section" value="matches" />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <div className="flex items-center gap-2"><Filter className="size-4 text-emerald-700" aria-hidden /><h3 className="text-sm font-black">Filtrar jogos</h3></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className="text-xs font-bold text-slate-600">Fase</span><select name="stage" defaultValue={filters.stage ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Todas</option><option value="league">Pontos corridos</option><option value="group">Grupos</option><option value="knockout">Mata-mata</option></select></label>
            <label><span className="text-xs font-bold text-slate-600">Grupo</span><input name="group" type="number" min="1" max="8" defaultValue={filters.groupNumber ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label><span className="text-xs font-bold text-slate-600">Rodada</span><input name="round" type="number" min="1" max="32" defaultValue={filters.roundNumber ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label><span className="text-xs font-bold text-slate-600">Situação</span><select name="view" defaultValue={filters.view} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="upcoming">Próximos</option><option value="completed">Encerrados</option><option value="unscheduled">A agendar</option><option value="all">Todos</option></select></label>
          </div>
          <button type="submit" className="mt-4 min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-black text-white">Aplicar filtros</button>
        </form>
        {page.items.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{page.items.map((fixture) => (
          <article key={fixture.id} className="app-surface p-5">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">{fixture.stage === "group" && fixture.group_number ? `Grupo ${String.fromCharCode(64 + fixture.group_number)} · ` : ""}Rodada {fixture.round_number}</p><span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">{fixture.situation === "upcoming" ? "Próximo" : fixture.situation === "completed" ? "Encerrado" : fixture.situation === "void" ? "Anulado" : "A agendar"}</span></div>
            <h3 className="mt-3 text-base font-black text-graphite">{fixture.side_a} × {fixture.side_b}</h3>
            <p className="mt-2 text-sm text-slate-500">{fixture.starts_at ? formatDate(fixture.starts_at, timeZone) : "Data ainda não definida"}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {fixture.event_id ? <Link href={`/app/${teamSlug}/events/${fixture.event_id}/matches?${new URLSearchParams({ returnTo: buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section: "matches", returnTo, extras: { ...extras, fixture: fixture.id } }) })}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-emerald-800">Abrir jogo<ChevronRight className="size-4" aria-hidden /></Link> : null}
              {canOperate ? <Link href={buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section: "matches", returnTo, extras: { ...extras, fixture: fixture.id } })} className="inline-flex min-h-11 items-center text-sm font-black text-slate-600">Gerenciar confronto</Link> : null}
            </div>
            {actionContext?.fixtureId === fixture.id ? <div className="mt-3 border-t border-slate-100 pt-3"><h4 className="text-sm font-black">Ações do confronto</h4>{!actionContext.matchStatus && actionContext.fixtureStatus === "scheduled" && actionContext.sides.length === 2 ? <LinkFixtureForm teamId={teamId} teamSlug={teamSlug} championshipId={championship.id} fixtureId={fixture.id} matches={actionContext.matches} /> : null}{actionContext.canRelease ? <ReleaseFixtureForm teamId={teamId} teamSlug={teamSlug} championshipId={championship.id} fixtureId={fixture.id} /> : null}{actionContext.stage === "knockout" && actionContext.sides.length === 2 ? <KnockoutResolutionForm teamId={teamId} teamSlug={teamSlug} championshipId={championship.id} fixtureId={fixture.id} sides={actionContext.sides} matchStatus={actionContext.matchStatus ?? undefined} currentWinnerId={actionContext.currentWinnerId} /> : null}</div> : null}
          </article>
        ))}</div> : <div className="app-surface mt-4 border-dashed p-8 text-center"><CalendarDays className="mx-auto size-8 text-slate-300" aria-hidden /><p className="mt-3 font-black">Nenhum jogo com estes filtros</p><Link href={buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section: "matches", returnTo })} className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-emerald-800">Limpar filtros</Link></div>}
        {page.next_cursor ? <Link href={buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section: "matches", returnTo, extras: { ...extras, cursor: encodeChampionshipFollowupCursor(page.next_cursor) } })} className="app-surface mt-4 flex min-h-12 items-center justify-center text-sm font-black text-emerald-800">Próxima página<ChevronRight className="ml-1 size-4" aria-hidden /></Link> : null}
      </section>
    </ChampionshipFollowupShell>
  );
}

function StandingsTable({ title, items }: { title: string; items: ChampionshipFollowupStanding[] }) {
  return <section className="app-surface overflow-hidden" aria-label={title}><div className="p-5"><h3 className="text-lg font-black">{title}</h3><p className="mt-1 text-xs text-slate-500">Empate esportivo compartilha posição.</p></div><ol className="divide-y divide-slate-100 sm:hidden">{items.map((standing) => <li key={standing.participant_id} className="p-4"><div className="flex items-center gap-3"><span className="font-black text-emerald-700">{standing.rank_position}</span><InternalSquadBadge badgeKey={standing.participant_badge_key} color={standing.participant_color} className="size-8 shrink-0" /><span className="min-w-0 flex-1 truncate font-black">{standing.participant_name}</span><span className="font-black">{standing.points} pts</span></div><p className="mt-2 text-xs text-slate-500">{standing.played} jogos · {standing.wins} vitórias · saldo {standing.goal_difference}</p></li>)}</ol><div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[38rem] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left">#</th><th className="px-2 py-3 text-left">Equipe</th>{["P", "J", "V", "E", "D", "GP", "GC", "SG"].map((label) => <th key={label} className="px-2 py-3 text-center">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{items.map((standing) => <tr key={standing.participant_id}><td className="px-4 py-3 font-black text-emerald-700">{standing.rank_position}</td><td className="px-2 py-3"><span className="flex items-center gap-2"><InternalSquadBadge badgeKey={standing.participant_badge_key} color={standing.participant_color} className="size-8 shrink-0" /><span className="font-black">{standing.participant_name}</span></span></td>{[standing.points, standing.played, standing.wins, standing.draws, standing.losses, standing.goals_for, standing.goals_against, standing.goal_difference].map((value, index) => <td key={index} className="px-2 py-3 text-center text-slate-600">{value}</td>)}</tr>)}</tbody></table></div></section>;
}

export function ChampionshipStandingsView({ teamId, teamSlug, timeZone, returnTo, championship, standings, knockoutPage, groupNumber, canConfigure, advanceContext }: BaseProps & { teamId: string; standings: ChampionshipFollowupStanding[]; knockoutPage: ChampionshipFollowupFixturePage | null; groupNumber: number; canConfigure: boolean; advanceContext: ChampionshipAdvanceContext | null }) {
  const groups = Array.from(new Set(standings.map((item) => item.group_number).filter((value): value is number => Boolean(value))));
  const visible = groups.length ? standings.filter((item) => item.group_number === groupNumber) : standings;
  return <ChampionshipFollowupShell teamSlug={teamSlug} returnTo={returnTo} championship={championship} currentSection="standings"><section aria-labelledby="standings-title"><p className="app-kicker">Sempre pela súmula</p><h2 id="standings-title" className="mt-1 text-2xl font-black">Classificação</h2>{groups.length ? <nav aria-label="Grupos" className="mt-4 flex gap-2 overflow-x-auto">{groups.map((group) => <Link key={group} aria-current={group === groupNumber ? "page" : undefined} href={buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section: "standings", returnTo, extras: { group } })} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-4 text-sm font-black ${group === groupNumber ? "bg-emerald-800 text-white" : "app-surface text-slate-600"}`}>Grupo {String.fromCharCode(64 + group)}</Link>)}</nav> : null}<div className="mt-4">{knockoutPage ? <><div className="grid gap-3 lg:grid-cols-2">{knockoutPage.items.map((fixture) => <article key={fixture.id} className="app-surface p-5"><p className="text-xs font-black uppercase text-emerald-700">Fase {fixture.round_number}</p><h3 className="mt-3 font-black">{fixture.side_a} × {fixture.side_b}</h3><p className="mt-2 text-sm text-slate-500">{fixture.starts_at ? formatDate(fixture.starts_at, timeZone) : fixture.side_b === "Avança sem jogo" ? "Avança sem jogo" : "A definir"}</p></article>)}</div>{knockoutPage.next_cursor ? <Link href={buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section: "standings", returnTo, extras: { cursor: encodeChampionshipFollowupCursor(knockoutPage.next_cursor) } })} className="app-surface mt-4 flex min-h-12 items-center justify-center text-sm font-black text-emerald-800">Próxima página<ChevronRight className="ml-1 size-4" aria-hidden /></Link> : null}</> : visible.length ? <StandingsTable title={groups.length ? `Grupo ${String.fromCharCode(64 + groupNumber)}` : "Classificação geral"} items={visible} /> : <div className="app-surface border-dashed p-8 text-center"><p className="font-black">Classificação ainda não disponível</p><p className="mt-1 text-sm text-slate-500">Os resultados aparecem após as súmulas finalizadas.</p></div>}</div>{canConfigure && advanceContext ? <section className="app-surface mt-5 p-5 sm:p-7" aria-labelledby="advance-title"><p className="app-kicker">Próxima fase</p><h3 id="advance-title" className="mt-1 text-xl font-black">Montar mata-mata</h3><p className="mt-1 text-sm text-slate-500">A decisão de empate exige motivo e fica auditada. A montagem bloqueia enquanto houver jogo aberto ou vaga indefinida.</p>{advanceContext.pendingDecisions.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{advanceContext.pendingDecisions.map((decision) => <QualifierDecisionForm key={`${decision.groupNumber}-${decision.qualifierPosition}`} teamId={teamId} teamSlug={teamSlug} championshipId={championship.id} {...decision} />)}</div> : null}<div className="mt-5"><GroupAdvanceControl teamId={teamId} teamSlug={teamSlug} championshipId={championship.id} disabled={!advanceContext.groupsClosed || advanceContext.pendingDecisions.length > 0} /></div></section> : null}</section></ChampionshipFollowupShell>;
}

export function ChampionshipTeamsView({ teamId, teamSlug, returnTo, championship, participants, canConfigure }: Omit<BaseProps, "timeZone"> & { teamId: string; participants: ChampionshipFollowupParticipant[]; canConfigure: boolean }) {
  return <ChampionshipFollowupShell teamSlug={teamSlug} returnTo={returnTo} championship={championship} currentSection="teams"><section aria-labelledby="teams-title"><p className="app-kicker">Inscrições do campeonato</p><h2 id="teams-title" className="mt-1 text-2xl font-black">Equipes</h2><p className="mt-1 text-sm text-slate-500">Identidade preservada no momento da inscrição.</p><div className="mt-4 grid items-start gap-3 lg:grid-cols-2">{participants.map((participant) => <article key={participant.id} className="app-surface p-4"><div className="flex min-h-12 items-center gap-3"><InternalSquadBadge badgeKey={participant.snapshot_badge_key} color={participant.snapshot_color} className="size-11 shrink-0" /><div className="min-w-0 flex-1"><h3 className="truncate font-black">{participant.snapshot_name}</h3><p className="mt-1 text-xs text-slate-500">Seed #{participant.seed}{participant.group_number ? ` · Grupo ${String.fromCharCode(64 + participant.group_number)}` : ""}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${participant.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{participant.status === "active" ? "Ativa" : "Retirada"}</span></div>{canConfigure && participant.status === "active" ? <WithdrawParticipantForm teamId={teamId} teamSlug={teamSlug} championshipId={championship.id} participantId={participant.id} /> : null}</article>)}</div>{!canConfigure ? <p className="mt-4 text-xs text-slate-500">Owner ou admin registra retirada de equipe. Seu acesso permanece somente para consulta.</p> : null}</section></ChampionshipFollowupShell>;
}

export function ChampionshipSectionError({ teamSlug, returnTo, championship, section }: Omit<BaseProps, "timeZone"> & { section: "matches" | "standings" | "teams" | "regulation" }) {
  return <ChampionshipFollowupShell teamSlug={teamSlug} returnTo={returnTo} championship={championship} currentSection={section}><section role="alert" className="app-surface border-red-200 bg-red-50 p-8 text-center"><CircleAlert className="mx-auto size-9 text-red-700" aria-hidden /><h2 className="mt-3 text-xl font-black text-red-950">Não foi possível carregar esta seção</h2><p className="mt-1 text-sm text-red-800">Tente novamente sem perder o campeonato.</p><Link href={buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section, returnTo })} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-red-300 bg-white px-4 text-sm font-black text-red-900">Tentar novamente</Link></section></ChampionshipFollowupShell>;
}
