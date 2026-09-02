import {
  AddParticipantForm,
  ChampionshipRegulationEditor,
  ChampionshipPublicationControls,
  GroupAdvanceControl,
  KnockoutResolutionForm,
  LinkFixtureForm,
  QualifierDecisionForm,
  ReopenChampionshipRegulationControl,
  ReleaseFixtureForm,
  WithdrawParticipantForm,
} from "@/components/championship-forms";
import { ChampionshipPublicControls } from "@/components/championship-public-controls";
import { InternalSquadBadge } from "@/components/internal-squad-badge";
import { ChampionshipCreationProgress } from "@/components/professional-creation-actions";
import { TeamAppHeader } from "@/components/team-app-header";
import { AppContainer } from "@/components/ui/app-shell";
import { requireUser } from "@/lib/auth/dal";
import { getChampionshipWorkspace } from "@/lib/data/championships";
import { championshipFormatLabels, championshipTiebreakLabels } from "@/lib/features/championships/rules";
import { getChampionshipCreationStep } from "@/lib/features/professional-scheduling/presentation";
import { isProfessionalSchedulingEnabled } from "@/lib/features/professional-scheduling/server";
import { getAppUrl } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  GitBranch,
  LockKeyhole,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusLabels = {
  draft: "Rascunho privado",
  published: "Publicado",
  active: "Em andamento",
  completed: "Encerrado",
  archived: "Arquivado",
};

const resolutionLabels = {
  score: "Placar",
  penalties: "Pênaltis",
  walkover: "W.O.",
  regulation: "Regulamento",
  administrative: "Decisão administrativa",
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
  const [{ data: membership }, workspace, professionalSchedulingEnabled] = await Promise.all([
    supabase.from("team_memberships").select("role").eq("team_id", team.id).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    getChampionshipWorkspace(team.id, championshipId),
    isProfessionalSchedulingEnabled(team.id),
  ]);
  if (!membership || !workspace) notFound();

  const {
    championship,
    participants,
    fixtures,
    slots,
    standings,
    groupStandings,
    qualificationDecisions,
    regulationVersions,
  } = workspace;
  const canConfigure = membership.role === "owner" || membership.role === "admin";
  const canOperate = canConfigure || membership.role === "manager";
  const currentRegulationVersion = regulationVersions.find(
    (version) => version.id === championship.regulation_version_id,
  ) ?? null;
  const professionalCreationStep = getChampionshipCreationStep({
    status: championship.status,
    participantCount: participants.length,
    fixtureCount: fixtures.length,
  });
  const publicUrl = new URL(`/c/${championship.public_id}`, getAppUrl()).toString();
  const availableInternalSquads = workspace.internalSquads.filter(
    (squad) => !participants.some((participant) => participant.internal_team_id === squad.id),
  );
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const slotsByFixture = new Map<string, typeof slots>();
  for (const slot of slots) {
    const current = slotsByFixture.get(slot.fixture_id) ?? [];
    current.push(slot);
    slotsByFixture.set(slot.fixture_id, current);
  }
  const resolveSlot = (slot: (typeof slots)[number] | undefined) => {
    if (!slot) return null;
    if (slot.participant_id) return participantById.get(slot.participant_id) ?? null;
    if (slot.source_fixture_id) {
      const source = fixtureById.get(slot.source_fixture_id);
      return source?.winner_participant_id
        ? participantById.get(source.winner_participant_id) ?? null
        : null;
    }
    return null;
  };

  const finalizedCount = fixtures.filter((fixture) => {
    if (fixture.winner_participant_id) return true;
    const status = fixture.match_id ? workspace.matchById[fixture.match_id]?.status : null;
    return status === "finalized" || status === "void";
  }).length;
  const groupSizes = Array.from(
    { length: championship.group_count ?? 0 },
    (_, index) => participants.filter((participant) => participant.group_number === index + 1).length,
  );
  const groupedFixtures = new Map<string, typeof fixtures>();
  for (const fixture of fixtures) {
    const key = `${fixture.stage}:${fixture.group_number ?? 0}:${fixture.round_number}`;
    const current = groupedFixtures.get(key) ?? [];
    current.push(fixture);
    groupedFixtures.set(key, current);
  }
  const groupFixtures = fixtures.filter((fixture) => fixture.stage === "group");
  const knockoutFixtures = fixtures.filter((fixture) => fixture.stage === "knockout");
  const groupsClosed = groupFixtures.length > 0 && groupFixtures.every((fixture) => {
    const status = fixture.match_id ? workspace.matchById[fixture.match_id]?.status : null;
    return status === "finalized" || status === "void";
  });

  const pendingQualifierDecisions: {
    groupNumber: number;
    qualifierPosition: number;
    candidates: { id: string; name: string }[];
  }[] = [];
  if (championship.format === "groups_knockout" && groupsClosed && !knockoutFixtures.length) {
    for (let groupNumber = 1; groupNumber <= (championship.group_count ?? 0); groupNumber += 1) {
      const ordered = groupStandings.filter((standing) => standing.group_number === groupNumber);
      for (let qualifierPosition = 1; qualifierPosition <= (championship.qualifiers_per_group ?? 0); qualifierPosition += 1) {
        const target = ordered[qualifierPosition - 1];
        if (!target) continue;
        const tied = ordered.filter((standing) => standing.rank_position === target.rank_position);
        const decided = qualificationDecisions.some(
          (decision) => decision.group_number === groupNumber
            && decision.qualifier_position === qualifierPosition
            && tied.some((standing) => standing.participant_id === decision.participant_id),
        );
        if (tied.length > 1 && !decided) {
          const alreadyChosen = new Set(
            qualificationDecisions
              .filter((decision) => decision.group_number === groupNumber)
              .map((decision) => decision.participant_id),
          );
          pendingQualifierDecisions.push({
            groupNumber,
            qualifierPosition,
            candidates: tied.filter((standing) => !alreadyChosen.has(standing.participant_id)).map((standing) => ({
              id: standing.participant_id,
              name: standing.participant_name,
            })),
          });
        }
      }
    }
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
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">{championshipFormatLabels[championship.format]}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">{championship.name}</h1>
            <p className="mt-3 text-sm text-slate-300">Vitória {championship.win_points} · empate {championship.draw_points} · derrota {championship.loss_points}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {[[participants.length, "Times"], [fixtures.length, "Jogos"], [`${finalizedCount}/${fixtures.length}`, "Resolvidos"]].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-white/5 p-3"><p className="font-black">{value}</p><p className="mt-0.5 text-[10px] text-slate-400">{label}</p></div>
              ))}
            </div>
          </div>
        </section>

        {canConfigure && professionalSchedulingEnabled ? (
          <ChampionshipCreationProgress currentStep={professionalCreationStep} />
        ) : null}

        <section className="app-surface p-5 sm:p-7" aria-labelledby="regulation-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="app-kicker">
                {championship.status === "draft" ? "Regulamento em revisão" : "Regulamento congelado"}
              </p>
              <h2 id="regulation-title" className="mt-1 text-xl font-black text-graphite">
                Pontuação e desempates
              </h2>
            </div>
            {currentRegulationVersion ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                Versão {currentRegulationVersion.version_number}
              </span>
            ) : null}
          </div>
          {championship.status === "draft" && canConfigure && professionalSchedulingEnabled ? (
            <div className="mt-5">
              <ChampionshipRegulationEditor
                teamId={team.id}
                teamSlug={team.slug}
                championshipId={championship.id}
                winPoints={championship.win_points}
                drawPoints={championship.draw_points}
                lossPoints={championship.loss_points}
                tiebreakOrder={championship.tiebreak_order}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[[championship.win_points, "Vitória"], [championship.draw_points, "Empate"], [championship.loss_points, "Derrota"]].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-black text-graphite">{value} pt</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <ol className="space-y-2">
                {championship.tiebreak_order.map((key, index) => (
                  <li key={key} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700">
                    <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-emerald-700">{index + 1}</span>
                    {championshipTiebreakLabels[key]}
                  </li>
                ))}
              </ol>
              <p className="text-xs leading-5 text-slate-500">
                Pontos são o critério principal. Confronto direto usa o mini-torneio das equipes que ainda estiverem empatadas naquele passo.
              </p>
              {canConfigure && professionalSchedulingEnabled && championship.status !== "completed" && championship.status !== "archived" ? (
                <ReopenChampionshipRegulationControl
                  teamId={team.id}
                  teamSlug={team.slug}
                  championshipId={championship.id}
                />
              ) : null}
            </div>
          )}
          {regulationVersions.length > 1 ? (
            <p className="mt-4 text-xs font-bold text-slate-500">
              {regulationVersions.length} versões preservadas no histórico.
            </p>
          ) : null}
        </section>

        {championship.status === "draft" && canConfigure ? (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <section className="app-surface p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><UsersRound className="size-5" aria-hidden /></span>
                <div><p className="app-kicker">Passo 1</p><h2 className="mt-1 text-xl font-black text-graphite">Participantes</h2><p className="mt-1 text-sm text-slate-500">De 2 a 32 equipes. Nome, escudo, seed e grupo ficam no histórico.</p></div>
              </div>
              <div className="mt-5 space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <InternalSquadBadge badgeKey={participant.snapshot_badge_key} color={participant.snapshot_color} className="size-9 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-graphite">{participant.snapshot_name}</span>
                    {participant.group_number ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">Grupo {String.fromCharCode(64 + participant.group_number)}</span> : null}
                    <span className="text-xs font-bold text-slate-400">#{participant.seed}</span>
                  </div>
                ))}
              </div>
              {participants.length < 32 ? (
                <details className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4" open={participants.length < 2}>
                  <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-black text-emerald-800">Adicionar participante</summary>
                  <div className="mt-3 border-t border-slate-100 pt-4">
                    <AddParticipantForm teamId={team.id} teamSlug={team.slug} championshipId={championship.id} seed={participants.length + 1} groupCount={championship.group_count} internalSquads={availableInternalSquads} />
                  </div>
                </details>
              ) : null}
            </section>

            <section className="app-surface p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><CalendarDays className="size-5" aria-hidden /></span>
                <div><p className="app-kicker">Passo 2</p><h2 className="mt-1 text-xl font-black text-graphite">Revisar e publicar</h2><p className="mt-1 text-sm text-slate-500">A geração é reproduzível. Seeds e regulamento congelam ao publicar.</p></div>
              </div>
              <div className="mt-5"><ChampionshipPublicationControls teamId={team.id} teamSlug={team.slug} championshipId={championship.id} format={championship.format} participantCount={participants.length} fixtureCount={fixtures.length} groupSizes={groupSizes} qualifiersPerGroup={championship.qualifiers_per_group ?? 1} /></div>
            </section>
          </div>
        ) : championship.status === "draft" ? (
          <p className="app-surface flex items-start gap-3 p-4 text-sm text-slate-600"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden />Owner ou admin conclui a preparação deste rascunho.</p>
        ) : null}

        {championship.status !== "draft" ? (
          <section aria-labelledby="participants-title">
            <div><p className="app-kicker">Inscrições congeladas</p><h2 id="participants-title" className="mt-1 text-xl font-black text-graphite">Participantes</h2><p className="mt-1 text-sm text-slate-500">Snapshots preservam nome e escudo; retiradas não apagam resultados concluídos.</p></div>
            <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
              {participants.map((participant) => (
                <article key={participant.id} className="app-surface p-4">
                  <div className="flex min-h-12 items-center gap-3">
                    <InternalSquadBadge badgeKey={participant.snapshot_badge_key} color={participant.snapshot_color} className="size-10 shrink-0" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-graphite">{participant.snapshot_name}</p><p className="mt-0.5 text-xs font-bold text-slate-400">Seed #{participant.seed}{participant.group_number ? ` · grupo ${String.fromCharCode(64 + participant.group_number)}` : ""}</p></div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${participant.status === "withdrawn" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{participant.status === "withdrawn" ? "Retirado" : "Ativo"}</span>
                  </div>
                  {canConfigure && participant.status === "active" ? <WithdrawParticipantForm teamId={team.id} teamSlug={team.slug} championshipId={championship.id} participantId={participant.id} /> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {championship.status !== "draft" && canConfigure ? (
          <ChampionshipPublicControls
            teamId={team.id}
            teamSlug={team.slug}
            championshipId={championship.id}
            publicId={championship.public_id}
            publicMode={championship.public_mode}
            publicUrl={publicUrl}
            championshipName={championship.name}
          />
        ) : null}

        {standings.length ? <StandingsTable title="Classificação" standings={standings} /> : null}

        {championship.status !== "draft" && groupStandings.length ? (
          <section aria-labelledby="groups-title">
            <div><p className="app-kicker">Sempre pela súmula</p><h2 id="groups-title" className="mt-1 text-xl font-black text-graphite">Classificação dos grupos</h2></div>
            <div className="mt-3 grid items-start gap-4 xl:grid-cols-2">
              {Array.from({ length: championship.group_count ?? 0 }, (_, index) => {
                const groupNumber = index + 1;
                return <StandingsTable key={groupNumber} title={`Grupo ${String.fromCharCode(64 + groupNumber)}`} standings={groupStandings.filter((standing) => standing.group_number === groupNumber)} />;
              })}
            </div>
          </section>
        ) : null}

        {championship.format === "groups_knockout" && championship.status !== "draft" && canConfigure && !knockoutFixtures.length ? (
          <section className="app-surface p-5 sm:p-7" aria-labelledby="advance-title">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700"><GitBranch className="size-5" aria-hidden /></span>
              <div><p className="app-kicker">Próxima fase</p><h2 id="advance-title" className="mt-1 text-xl font-black text-graphite">Montar mata-mata</h2><p className="mt-1 text-sm text-slate-500">Todos os jogos precisam estar encerrados ou anulados. Vaga ainda empatada exige decisão com motivo.</p></div>
            </div>
            {pendingQualifierDecisions.length ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {pendingQualifierDecisions.map((decision) => <QualifierDecisionForm key={`${decision.groupNumber}-${decision.qualifierPosition}`} teamId={team.id} teamSlug={team.slug} championshipId={championship.id} {...decision} />)}
              </div>
            ) : null}
            <div className="mt-5"><GroupAdvanceControl teamId={team.id} teamSlug={team.slug} championshipId={championship.id} disabled={!groupsClosed || pendingQualifierDecisions.length > 0} /></div>
          </section>
        ) : null}

        <section aria-labelledby="fixtures-title">
          <div className="flex items-end justify-between gap-3"><div><p className="app-kicker">Grade publicada</p><h2 id="fixtures-title" className="mt-1 text-xl font-black text-graphite">Confrontos</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{fixtures.length}</span></div>
          {fixtures.length ? (
            <div className="mt-3 space-y-5">
              {Array.from(groupedFixtures.entries()).map(([key, roundFixtures]) => {
                const sample = roundFixtures[0];
                if (!sample) return null;
                const stageLabel = sample.stage === "group"
                  ? `Grupo ${String.fromCharCode(64 + (sample.group_number ?? 1))} · rodada ${sample.round_number}`
                  : sample.stage === "knockout"
                    ? `Mata-mata · fase ${sample.round_number}`
                    : `Rodada ${sample.round_number}`;
                return (
                  <section key={key} className="space-y-2" aria-labelledby={`round-${key}`}>
                    <h3 id={`round-${key}`} className="px-1 text-xs font-black uppercase tracking-wider text-slate-500">{stageLabel}</h3>
                    {roundFixtures.map((fixture) => {
                      const fixtureSlots = [...(slotsByFixture.get(fixture.id) ?? [])].sort((a, b) => a.side_index - b.side_index);
                      const sideOne = resolveSlot(fixtureSlots[0]);
                      const sideTwo = resolveSlot(fixtureSlots[1]);
                      const match = fixture.match_id ? workspace.matchById[fixture.match_id] : null;
                      const sides = [sideOne, sideTwo].filter((side): side is NonNullable<typeof side> => Boolean(side));
                      const winner = fixture.winner_participant_id ? participantById.get(fixture.winner_participant_id) : null;
                      return (
                        <article key={fixture.id} className="app-surface p-4 sm:p-5">
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                            {[sideOne, sideTwo].map((side, index) => {
                              const slot = fixtureSlots[index];
                              const label = side?.snapshot_name ?? (slot?.kind === "bye" ? "Bye" : "A definir");
                              return <div key={side?.id ?? `${fixture.id}-${index}`} className="min-w-0"><InternalSquadBadge badgeKey={side?.snapshot_badge_key ?? "shield"} color={side?.snapshot_color ?? "#64748B"} className="mx-auto size-10" /><p className="mt-2 truncate text-sm font-black text-graphite">{label}</p></div>;
                            }).flatMap((node, index) => index === 0 ? [node, <span key="versus" className="text-sm font-black text-slate-400">×</span>] : [node])}
                          </div>
                          {winner ? <p className="mt-3 rounded-xl bg-violet-50 p-3 text-center text-xs font-black text-violet-900">Avança: {winner.snapshot_name} · {fixture.resolution ? resolutionLabels[fixture.resolution] : "Definido"}</p> : null}
                          {match ? (
                            <Link href={`/app/${team.slug}/events/${match.eventId}/matches`} className="mt-4 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-900">
                              <span className="min-w-0 truncate">{match.eventTitle} · partida {match.ordinal}</span>
                              <span className="flex shrink-0 items-center gap-1 text-xs"><BadgeCheck className="size-4" aria-hidden />{match.status === "finalized" ? "Encerrada" : match.status === "void" ? "Anulada" : "Agendada"}</span>
                            </Link>
                          ) : canOperate && championship.status !== "draft" && fixture.status === "scheduled" && sides.length === 2 ? (
                            <LinkFixtureForm teamId={team.id} teamSlug={team.slug} championshipId={championship.id} fixtureId={fixture.id} matches={workspace.candidateMatches} />
                          ) : championship.status === "draft" ? <p className="mt-3 text-center text-xs font-bold text-slate-400">Aguardando publicação</p> : null}
                          {canOperate && match?.status === "scheduled" && Date.parse(match.startsAt) > Date.now() ? (
                            <ReleaseFixtureForm teamId={team.id} teamSlug={team.slug} championshipId={championship.id} fixtureId={fixture.id} />
                          ) : null}
                          {canOperate && fixture.stage === "knockout" && championship.status !== "draft" && sides.length === 2 ? (
                            <KnockoutResolutionForm teamId={team.id} teamSlug={team.slug} championshipId={championship.id} fixtureId={fixture.id} sides={sides.map((side) => ({ id: side.id, name: side.snapshot_name }))} matchStatus={match?.status} currentWinnerId={fixture.winner_participant_id} />
                          ) : null}
                        </article>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="app-surface mt-3 border-dashed p-8 text-center"><CalendarDays className="mx-auto size-8 text-slate-300" aria-hidden /><p className="mt-3 font-black text-graphite">Grade ainda não gerada</p><p className="mt-1 text-sm text-slate-500">Adicione os participantes e distribua os grupos quando necessário.</p></div>
          )}
        </section>
      </AppContainer>
    </main>
  );
}

function StandingsTable({
  title,
  standings,
}: {
  title: string;
  standings: {
    participant_id: string;
    participant_name: string;
    participant_badge_key: "shield" | "stripes" | "sash" | "quarters" | "circle" | "diamond";
    participant_color: string;
    rank_position: number;
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
  }[];
}) {
  return (
    <section className="app-surface overflow-hidden" aria-label={title}>
      <div className="p-5"><h3 className="text-lg font-black text-graphite">{title}</h3><p className="mt-1 text-xs text-slate-500">Anulações não pontuam; empate absoluto compartilha posição.</p></div>
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
  );
}
