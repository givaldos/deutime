import {
  AddParticipantForm,
  LeaguePublicationControls,
  LinkFixtureForm,
} from "@/components/championship-forms";
import { InternalSquadBadge } from "@/components/internal-squad-badge";
import { TeamAppHeader } from "@/components/team-app-header";
import { AppContainer } from "@/components/ui/app-shell";
import { requireUser } from "@/lib/auth/dal";
import { getChampionshipWorkspace } from "@/lib/data/championships";
import { describeLeagueProgress } from "@/lib/features/championships/rules";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BadgeCheck, CalendarDays, LockKeyhole, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusLabels = {
  draft: "Rascunho privado",
  published: "Publicado",
  active: "Em andamento",
  completed: "Encerrado",
  archived: "Arquivado",
};

export default async function ChampionshipPage({
  params,
}: {
  params: Promise<{ teamSlug: string; championshipId: string }>;
}) {
  const user = await requireUser();
  const { teamSlug, championshipId } = await params;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase.from("teams").select("id, name, slug, timezone").eq("slug", teamSlug).maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();
  const [{ data: membership }, workspace] = await Promise.all([
    supabase.from("team_memberships").select("role").eq("team_id", team.id).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    getChampionshipWorkspace(team.id, championshipId),
  ]);
  if (!membership || !workspace) notFound();

  const { championship, participants, fixtures, slots, standings } = workspace;
  const canConfigure = membership.role === "owner" || membership.role === "admin";
  const availableInternalSquads = workspace.internalSquads.filter(
    (squad) => !participants.some((participant) => participant.internal_team_id === squad.id),
  );
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const slotsByFixture = new Map<string, typeof slots>();
  for (const slot of slots) {
    const current = slotsByFixture.get(slot.fixture_id) ?? [];
    current.push(slot);
    slotsByFixture.set(slot.fixture_id, current);
  }
  const finalizedCount = fixtures.filter((fixture) => fixture.match_id && workspace.matchById[fixture.match_id]?.status === "finalized").length;
  const progress = describeLeagueProgress(participants.length, finalizedCount);
  const rounds = new Map<number, typeof fixtures>();
  for (const fixture of fixtures) {
    const current = rounds.get(fixture.round_number) ?? [];
    current.push(fixture);
    rounds.set(fixture.round_number, current);
  }

  return (
    <main className="app-canvas min-h-screen pb-16">
      <TeamAppHeader currentName={team.name} currentSlug={team.slug} teams={teams ?? []} />
      <AppContainer className="space-y-6 pb-12">
        <Link href={`/app/${team.slug}/championships`} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="size-4" aria-hidden /> Campeonatos
        </Link>

        <section className="relative overflow-hidden rounded-[2rem] bg-grass p-6 text-white shadow-float sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-emerald-300"><Trophy className="size-6" aria-hidden /></span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-emerald-100">{statusLabels[championship.status]}</span>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Pontos corridos</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">{championship.name}</h1>
            <p className="mt-3 text-sm text-slate-300">Vitória {championship.win_points} · empate {championship.draw_points} · derrota {championship.loss_points}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {[[participants.length, "Times"], [fixtures.length, "Jogos"], [`${progress.finalized}/${progress.total}`, "Encerrados"]].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-white/5 p-3"><p className="font-black">{value}</p><p className="mt-0.5 text-[10px] text-slate-400">{label}</p></div>
              ))}
            </div>
          </div>
        </section>

        {championship.status === "draft" && canConfigure ? (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <section className="app-surface p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><UsersRound className="size-5" aria-hidden /></span>
                <div><p className="app-kicker">Passo 1</p><h2 className="mt-1 text-xl font-black text-graphite">Participantes</h2><p className="mt-1 text-sm text-slate-500">De 2 a 32 equipes. O nome e o escudo ficam congelados como histórico.</p></div>
              </div>
              <div className="mt-5 space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <InternalSquadBadge badgeKey={participant.snapshot_badge_key} color={participant.snapshot_color} className="size-9 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-graphite">{participant.snapshot_name}</span>
                    <span className="text-xs font-bold text-slate-400">#{participant.seed}</span>
                  </div>
                ))}
              </div>
              {participants.length < 32 ? (
                <details className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4" open={participants.length < 2}>
                  <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-black text-emerald-800">Adicionar participante</summary>
                  <div className="mt-3 border-t border-slate-100 pt-4">
                    <AddParticipantForm teamId={team.id} teamSlug={team.slug} championshipId={championship.id} seed={participants.length + 1} internalSquads={availableInternalSquads} />
                  </div>
                </details>
              ) : null}
            </section>

            <section className="app-surface p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><CalendarDays className="size-5" aria-hidden /></span>
                <div><p className="app-kicker">Passo 2</p><h2 className="mt-1 text-xl font-black text-graphite">Revisar e publicar</h2><p className="mt-1 text-sm text-slate-500">A geração é reproduzível. O regulamento congela somente ao publicar.</p></div>
              </div>
              <div className="mt-5"><LeaguePublicationControls teamId={team.id} teamSlug={team.slug} championshipId={championship.id} participantCount={participants.length} fixtureCount={fixtures.length} /></div>
            </section>
          </div>
        ) : championship.status === "draft" ? (
          <p className="app-surface flex items-start gap-3 p-4 text-sm text-slate-600"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden />Owner ou admin conclui a preparação deste rascunho.</p>
        ) : null}

        {standings.length ? (
          <section className="app-surface overflow-hidden" aria-labelledby="standings-title">
            <div className="p-5 sm:p-7"><p className="app-kicker">Sempre pela súmula</p><h2 id="standings-title" className="mt-1 text-xl font-black text-graphite">Classificação</h2><p className="mt-1 text-sm text-slate-500">Partidas anuladas não pontuam. Empate absoluto compartilha posição.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left">#</th><th className="px-2 py-3 text-left">Equipe</th><th className="px-2 py-3 text-center">P</th><th className="px-2 py-3 text-center">J</th><th className="px-2 py-3 text-center">V</th><th className="px-2 py-3 text-center">E</th><th className="px-2 py-3 text-center">D</th><th className="px-2 py-3 text-center">GP</th><th className="px-2 py-3 text-center">GC</th><th className="px-4 py-3 text-center">SG</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {standings.map((standing) => (
                    <tr key={standing.participant_id}>
                      <td className="px-4 py-3 font-black text-emerald-700">{standing.rank_position}</td>
                      <td className="px-2 py-3"><span className="flex items-center gap-2"><InternalSquadBadge badgeKey={standing.participant_badge_key} color={standing.participant_color} className="size-8 shrink-0" /><span className="font-black text-graphite">{standing.participant_name}</span></span></td>
                      {[standing.points, standing.played, standing.wins, standing.draws, standing.losses, standing.goals_for, standing.goals_against, standing.goal_difference].map((value, index) => <td key={index} className={`px-2 py-3 text-center ${index === 0 ? "font-black text-graphite" : "text-slate-600"}`}>{value}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="fixtures-title">
          <div className="flex items-end justify-between gap-3"><div><p className="app-kicker">Turno único</p><h2 id="fixtures-title" className="mt-1 text-xl font-black text-graphite">Confrontos</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{fixtures.length}</span></div>
          {fixtures.length ? (
            <div className="mt-3 space-y-5">
              {Array.from(rounds.entries()).map(([roundNumber, roundFixtures]) => (
                <section key={roundNumber} className="space-y-2" aria-labelledby={`round-${roundNumber}`}>
                  <h3 id={`round-${roundNumber}`} className="px-1 text-xs font-black uppercase tracking-wider text-slate-500">Rodada {roundNumber}</h3>
                  {roundFixtures.map((fixture) => {
                    const fixtureSlots = (slotsByFixture.get(fixture.id) ?? []).sort((a, b) => a.side_index - b.side_index);
                    const sideOne = fixtureSlots[0]?.participant_id ? participantById.get(fixtureSlots[0].participant_id) : null;
                    const sideTwo = fixtureSlots[1]?.participant_id ? participantById.get(fixtureSlots[1].participant_id) : null;
                    const match = fixture.match_id ? workspace.matchById[fixture.match_id] : null;
                    return (
                      <article key={fixture.id} className="app-surface p-4 sm:p-5">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                          {[sideOne, sideTwo].map((side, index) => <div key={side?.id ?? index} className="min-w-0"><InternalSquadBadge badgeKey={side?.snapshot_badge_key ?? "shield"} color={side?.snapshot_color ?? "#64748B"} className="mx-auto size-10" /><p className="mt-2 truncate text-sm font-black text-graphite">{side?.snapshot_name ?? "A definir"}</p></div>).flatMap((node, index) => index === 0 ? [node, <span key="versus" className="text-sm font-black text-slate-400">×</span>] : [node])}
                        </div>
                        {match ? (
                          <Link href={`/app/${team.slug}/events/${match.eventId}/matches`} className="mt-4 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-900">
                            <span className="min-w-0 truncate">{match.eventTitle} · partida {match.ordinal}</span>
                            <span className="flex shrink-0 items-center gap-1 text-xs"><BadgeCheck className="size-4" aria-hidden />{match.status === "finalized" ? "Encerrada" : match.status === "void" ? "Anulada" : "Agendada"}</span>
                          </Link>
                        ) : championship.status !== "draft" ? (
                          <LinkFixtureForm teamId={team.id} teamSlug={team.slug} championshipId={championship.id} fixtureId={fixture.id} matches={workspace.candidateMatches} />
                        ) : <p className="mt-3 text-center text-xs font-bold text-slate-400">Aguardando publicação</p>}
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>
          ) : (
            <div className="app-surface mt-3 border-dashed p-8 text-center"><CalendarDays className="mx-auto size-8 text-slate-300" aria-hidden /><p className="mt-3 font-black text-graphite">Grade ainda não gerada</p><p className="mt-1 text-sm text-slate-500">Adicione pelo menos dois participantes.</p></div>
          )}
        </section>
      </AppContainer>
    </main>
  );
}
