import { AppContainer } from "@/components/ui/app-shell";
import type { ChampionshipFollowupSummary } from "@/lib/data/championship-followup";
import { championshipFormatLabels } from "@/lib/features/championships/rules";
import {
  buildChampionshipFollowupUrl,
  type ChampionshipFollowupSection,
} from "@/lib/navigation/championship-followup";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const sectionLabels: Record<ChampionshipFollowupSection, string> = {
  summary: "Resumo",
  matches: "Jogos",
  standings: "Classificação",
  teams: "Equipes",
  regulation: "Regulamento",
};

type ChampionshipIdentity = ChampionshipFollowupSummary["championship"];

function formatGameDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function ChampionshipFollowupShell({
  teamSlug,
  returnTo,
  championship,
  currentSection,
  children,
}: {
  teamSlug: string;
  returnTo: string | null;
  championship: ChampionshipIdentity;
  currentSection: ChampionshipFollowupSection;
  children: ReactNode;
}) {
  const base = {
    teamSlug,
    championshipId: championship.id,
    returnTo,
  };
  const sections = Object.entries(sectionLabels) as [ChampionshipFollowupSection, string][];

  return (
    <main className="app-canvas min-h-screen pb-16">
      <AppContainer className="space-y-5 pb-12">
        <Link
          href={returnTo ?? `/app/${teamSlug}/championships`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <ArrowLeft className="size-4" aria-hidden /> Campeonatos
        </Link>

        <header className="relative overflow-hidden rounded-[2rem] bg-grass p-6 text-white shadow-float sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-emerald-300">
                <Trophy className="size-6" aria-hidden />
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-emerald-100">
                {championship.status_label}
              </span>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">
              {championshipFormatLabels[championship.format]}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              {championship.name}
            </h1>
          </div>
        </header>

        <details className="app-surface group p-2 sm:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl px-3 text-sm font-black text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
            <span>Seção do campeonato: {sectionLabels[currentSection]}</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <nav aria-label="Seções do campeonato" className="mt-1 grid gap-1 border-t border-slate-100 pt-2">
            {sections.map(([section, label]) => (
              <Link
                key={section}
                href={buildChampionshipFollowupUrl({ ...base, section })}
                aria-current={section === currentSection ? "page" : undefined}
                className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${section === currentSection ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {label}<ChevronRight className="size-4" aria-hidden />
              </Link>
            ))}
          </nav>
        </details>

        <nav aria-label="Seções do campeonato" className="app-surface hidden gap-1 p-2 sm:flex">
          {sections.map(([section, label]) => (
            <Link
              key={section}
              href={buildChampionshipFollowupUrl({ ...base, section })}
              aria-current={section === currentSection ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-center text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${section === currentSection ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-emerald-900"}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {children}
      </AppContainer>
    </main>
  );
}

function actionHref(
  teamSlug: string,
  summary: ChampionshipFollowupSummary,
  returnTo: string | null,
) {
  const base = {
    teamSlug,
    championshipId: summary.championship.id,
    returnTo,
  };
  switch (summary.next_action.kind) {
    case "resolve_qualification":
    case "build_knockout":
      return buildChampionshipFollowupUrl({ ...base, section: "standings" });
    case "schedule_matches":
      return `${buildChampionshipFollowupUrl({ ...base, section: "matches" })}&view=unscheduled`;
    case "view_next_match": {
      const nextGame = summary.next_games[0];
      return nextGame ? `/app/${teamSlug}/events/${nextGame.event_id}/matches` : null;
    }
    default:
      return null;
  }
}

export function ChampionshipFollowupSummaryView({
  teamSlug,
  timeZone,
  returnTo,
  summary,
}: {
  teamSlug: string;
  timeZone: string;
  returnTo: string | null;
  summary: ChampionshipFollowupSummary;
}) {
  const { progress } = summary;
  const progressPercent = progress.planned_matches > 0
    ? Math.min(100, Math.round((progress.completed_matches / progress.planned_matches) * 100))
    : 0;
  const nextActionHref = summary.next_action.allowed
    ? actionHref(teamSlug, summary, returnTo)
    : null;
  const emptyGamesMessage = progress.unscheduled_matches > 0
    ? "Há jogos a agendar."
    : progress.planned_matches > 0 && progress.completed_matches >= progress.planned_matches
      ? "Todos os jogos foram encerrados."
      : "Nenhum próximo jogo agendado.";

  return (
    <ChampionshipFollowupShell
      teamSlug={teamSlug}
      returnTo={returnTo}
      championship={summary.championship}
      currentSection="summary"
    >
      <section className="app-surface p-5 sm:p-7" aria-labelledby="championship-phase-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="app-kicker">Fase atual</p>
            <h2 id="championship-phase-title" className="mt-1 text-2xl font-black text-graphite">
              {summary.phase.label}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {progress.completed_matches} de {progress.planned_matches} jogos concluídos
            </p>
          </div>
          <div className="min-w-40 rounded-2xl bg-emerald-50 p-4 text-emerald-950">
            <p className="text-xs font-bold uppercase tracking-wide">Progresso</p>
            <p className="mt-1 text-2xl font-black">{progressPercent}%</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            [summary.active_participants, "Equipes ativas"],
            [progress.scheduled_matches, "Jogos agendados"],
            [progress.unscheduled_matches, "A agendar"],
            [summary.regulation_version_number ? `v${summary.regulation_version_number}` : "Sem versão", "Regulamento"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-lg font-black text-graphite">{value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="app-surface border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-labelledby="championship-next-action-title">
        <p className="app-kicker">Próxima ação</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="championship-next-action-title" className="text-xl font-black text-emerald-950">
              {summary.next_action.label}
            </h2>
            {!summary.next_action.allowed ? (
              <p className="mt-1 text-sm text-emerald-900/70">Owner ou admin pode concluir esta etapa.</p>
            ) : null}
          </div>
          {nextActionHref ? (
            <Link href={nextActionHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
              {summary.next_action.label}<ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="next-games-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="app-kicker">Agenda</p>
            <h2 id="next-games-title" className="mt-1 text-xl font-black text-graphite">Próximos jogos</h2>
          </div>
          <Link href={buildChampionshipFollowupUrl({ teamSlug, championshipId: summary.championship.id, section: "matches", returnTo })} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
            Ver jogos<ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        {summary.next_games.length ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {summary.next_games.map((game) => (
              <article key={game.fixture_id} className="app-surface flex flex-col p-5">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  {game.stage === "group" && game.group_number ? `Grupo ${String.fromCharCode(64 + game.group_number)} · ` : ""}Rodada {game.round_number}
                </p>
                <h3 className="mt-3 text-base font-black text-graphite">{game.side_a} × {game.side_b}</h3>
                <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
                  {formatGameDate(game.starts_at, timeZone)}
                </p>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                  <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden />{game.event_title}
                </p>
                <Link href={`/app/${teamSlug}/events/${game.event_id}/matches`} className="mt-4 inline-flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3 text-sm font-bold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                  Abrir jogo<ChevronRight className="size-4" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="app-surface mt-3 border-dashed p-8 text-center">
            <CalendarDays className="mx-auto size-8 text-slate-300" aria-hidden />
            <p className="mt-3 font-black text-graphite">{emptyGamesMessage}</p>
          </div>
        )}
      </section>
    </ChampionshipFollowupShell>
  );
}

export function ChampionshipFollowupSummaryError({
  teamSlug,
  returnTo,
  championship,
}: {
  teamSlug: string;
  returnTo: string | null;
  championship: ChampionshipIdentity;
}) {
  return (
    <ChampionshipFollowupShell
      teamSlug={teamSlug}
      returnTo={returnTo}
      championship={championship}
      currentSection="summary"
    >
      <section role="alert" className="app-surface border-red-200 bg-red-50 p-8 text-center">
        <CircleAlert className="mx-auto size-9 text-red-700" aria-hidden />
        <h2 className="mt-3 text-xl font-black text-red-950">Não foi possível carregar o resumo</h2>
        <p className="mt-1 text-sm text-red-800">Atualize a página e tente novamente.</p>
        <Link href={buildChampionshipFollowupUrl({ teamSlug, championshipId: championship.id, section: "summary", returnTo })} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 bg-white px-4 text-sm font-black text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
          Tentar novamente
        </Link>
      </section>
    </ChampionshipFollowupShell>
  );
}
