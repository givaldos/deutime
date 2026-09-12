import { CreateChampionshipForm } from "@/components/championship-forms";
import { AppContainer } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/dal";
import { getChampionships, type ChampionshipSummary } from "@/lib/data/championships";
import {
  buildManagementChampionshipListUrl,
  getManagementChampionshipPage,
  parseManagementChampionshipSearchParams,
  type ManagementChampionshipFilters,
  type ManagementChampionshipItem,
  type ManagementChampionshipPage,
  type RawManagementChampionshipSearchParams,
} from "@/lib/data/management-championships";
import { getInternalSquadConfiguration } from "@/lib/data/internal-squads";
import { championshipFormatLabels } from "@/lib/features/championships/rules";
import { isProfessionalSchedulingEnabled } from "@/lib/features/professional-scheduling/server";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Filter,
  LockKeyhole,
  Plus,
  RotateCcw,
  Search,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusLabels = {
  draft: "Configuração em andamento",
  published: "A começar",
  active: "Em andamento",
  completed: "Encerrado",
  archived: "Arquivado",
} as const;

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}

function filterBase(filters: ManagementChampionshipFilters) {
  return {
    status: filters.status,
    search: filters.search,
    format: filters.format,
    createdStart: filters.createdStart,
    createdEnd: filters.createdEnd,
  };
}

function championshipDetailHref(teamSlug: string, championshipId: string, returnTo: string) {
  return `/app/${teamSlug}/championships/${championshipId}?${new URLSearchParams({ returnTo })}`;
}

function ChampionshipFilters({ teamSlug, filters }: {
  teamSlug: string;
  filters: ManagementChampionshipFilters;
}) {
  const clearUrl = buildManagementChampionshipListUrl(teamSlug, {
    status: null,
    search: null,
    format: null,
    createdStart: null,
    createdEnd: null,
  });
  return (
    <form action={`/app/${teamSlug}/championships`} method="get" className="app-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-emerald-700" aria-hidden />
          <h2 className="text-sm font-black text-graphite">Encontrar campeonatos</h2>
        </div>
        <Link href={clearUrl} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold text-slate-600 hover:text-emerald-800">
          <RotateCcw className="size-3.5" aria-hidden /> Limpar filtros
        </Link>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="text-xs font-bold text-slate-600">Nome</span>
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" aria-hidden />
            <input name="q" type="search" minLength={2} maxLength={80} defaultValue={filters.search ?? ""} placeholder="Ex.: Copa de inverno" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
          </span>
        </label>
        <label>
          <span className="text-xs font-bold text-slate-600">Situação</span>
          <select name="status" defaultValue={filters.status ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
            <option value="">Todas</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-bold text-slate-600">Formato</span>
          <select name="format" defaultValue={filters.format ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
            <option value="">Todos</option>
            {Object.entries(championshipFormatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-bold text-slate-600">Criado de</span>
          <input name="from" type="date" defaultValue={filters.createdStart ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
        </label>
        <label>
          <span className="text-xs font-bold text-slate-600">Criado até</span>
          <input name="to" type="date" defaultValue={filters.createdEnd ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
        </label>
      </div>
      <Button type="submit" className="mt-4 w-full sm:w-auto"><Search aria-hidden /> Aplicar filtros</Button>
    </form>
  );
}

function ChampionshipCard({ championship, teamSlug, timeZone, returnTo }: {
  championship: ManagementChampionshipItem;
  teamSlug: string;
  timeZone: string;
  returnTo: string;
}) {
  const progress = championship.total_fixtures
    ? Math.round((championship.completed_fixtures / championship.total_fixtures) * 100)
    : 0;
  return (
    <Link href={championshipDetailHref(teamSlug, championship.id, returnTo)} className="app-surface app-interactive group block p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Trophy className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-700">{championshipFormatLabels[championship.format]}</p>
              <h2 className="mt-1 truncate font-black text-graphite">{championship.name}</h2>
              <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700">{championship.status_label}</span>
            </div>
            <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:text-emerald-700" aria-hidden />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><UsersRound className="size-3.5" aria-hidden />{championship.active_participants} participantes</span>
            <span className="flex items-center gap-1.5"><Trophy className="size-3.5" aria-hidden />{championship.completed_fixtures}/{championship.total_fixtures} confrontos encerrados</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden />Criado em {formatDate(championship.created_at, timeZone)}</span>
          </div>
          <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Progress className="h-1.5 flex-1" label={`Andamento de ${championship.name}`} value={progress} />
            <span className="text-right text-[10px] font-bold text-slate-500">{championship.next_action}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function LegacyChampionshipCard({ championship, teamSlug }: {
  championship: ChampionshipSummary;
  teamSlug: string;
}) {
  return (
    <Link href={`/app/${teamSlug}/championships/${championship.id}`} className="app-surface flex min-h-20 items-center gap-4 p-4 transition hover:border-emerald-300">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Trophy className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-black text-graphite">{championship.name}</span>
        <span className="mt-1 block text-xs font-bold text-slate-500">{championshipFormatLabels[championship.format]} · {statusLabels[championship.status]}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
    </Link>
  );
}

function EnhancedChampionshipList({ teamSlug, timeZone, filters, page, canConfigure }: {
  teamSlug: string;
  timeZone: string;
  filters: ManagementChampionshipFilters;
  page: ManagementChampionshipPage;
  canConfigure: boolean;
}) {
  const base = filterBase(filters);
  const returnTo = buildManagementChampionshipListUrl(teamSlug, base, filters.cursor);
  const hasFilters = Boolean(filters.status || filters.search || filters.format || filters.createdStart || filters.createdEnd);
  const clearUrl = buildManagementChampionshipListUrl(teamSlug, { status: null, search: null, format: null, createdStart: null, createdEnd: null });
  return (
    <section aria-labelledby="championship-list-title" className="space-y-4">
      <ChampionshipFilters teamSlug={teamSlug} filters={filters} />
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div><p className="app-kicker">Área do time</p><h2 id="championship-list-title" className="mt-1 text-xl font-black text-graphite">Campeonatos encontrados</h2></div>
        <p aria-live="polite" aria-atomic="true" className="text-sm font-bold text-slate-600">{page.filtered_count} {page.filtered_count === 1 ? "campeonato" : "campeonatos"}</p>
      </div>
      {page.items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">{page.items.map((championship) => <ChampionshipCard key={championship.id} championship={championship} teamSlug={teamSlug} timeZone={timeZone} returnTo={returnTo} />)}</div>
      ) : (
        <div className="app-surface border-dashed p-8 text-center">
          <Trophy className="mx-auto size-8 text-slate-300" aria-hidden />
          <p className="mt-3 font-black text-graphite">{hasFilters ? "Nenhum resultado com estes filtros" : "Nenhum campeonato ainda"}</p>
          <p className="mt-1 text-sm text-slate-500">{hasFilters ? "Ajuste a busca ou limpe os filtros para tentar novamente." : "Crie o primeiro em cinco passos simples."}</p>
          {hasFilters ? <Button asChild variant="outline" className="mt-5"><Link href={clearUrl}>Limpar filtros</Link></Button> : canConfigure ? <Button asChild className="mt-5"><Link href={`/app/${teamSlug}/championships?new=1`}>Criar primeiro campeonato</Link></Button> : null}
        </div>
      )}
      {page.next_cursor ? <div className="flex justify-center"><Button asChild variant="outline"><Link href={buildManagementChampionshipListUrl(teamSlug, base, page.next_cursor)}>Próxima página <ChevronRight aria-hidden /></Link></Button></div> : null}
    </section>
  );
}

export default async function ChampionshipsPage({ params, searchParams }: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<RawManagementChampionshipSearchParams>;
}) {
  const user = await requireUser();
  const [{ teamSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id, name, slug, timezone").eq("slug", teamSlug).maybeSingle();
  if (!team) notFound();
  const { data: membership } = await supabase.from("team_memberships").select("role").eq("team_id", team.id).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!membership) notFound();

  const canConfigure = membership.role === "owner" || membership.role === "admin";
  const parsedFilters = parseManagementChampionshipSearchParams(query);
  const managementResult = parsedFilters.ok ? await getManagementChampionshipPage(team.id, parsedFilters.filters) : { mode: "error" as const };
  const [professionalSchedulingEnabled, legacyChampionships] = await Promise.all([
    isProfessionalSchedulingEnabled(team.id),
    managementResult.mode === "unavailable" ? getChampionships(team.id) : Promise.resolve(null),
  ]);
  if (managementResult.mode === "unavailable" && legacyChampionships === null) notFound();

  const internalConfiguration = canConfigure && professionalSchedulingEnabled ? await getInternalSquadConfiguration(team.id) : null;
  const professionalConfigurationReady = Boolean(
    internalConfiguration && internalConfiguration.squads.length >= 2 &&
    internalConfiguration.defaultHomeTeamId && internalConfiguration.defaultAwayTeamId &&
    internalConfiguration.defaultHomeTeamId !== internalConfiguration.defaultAwayTeamId,
  );
  const enhancedUnfilteredEmpty = managementResult.mode === "enhanced" && parsedFilters.ok &&
    managementResult.page.filtered_count === 0 && !parsedFilters.filters.status &&
    !parsedFilters.filters.search && !parsedFilters.filters.format && !parsedFilters.filters.createdStart;
  const openCreation = canConfigure && (
    (parsedFilters.ok && parsedFilters.openNew) || enhancedUnfilteredEmpty ||
    (managementResult.mode === "unavailable" && legacyChampionships?.length === 0)
  );

  return (
    <main className="app-canvas min-h-screen pb-16">
      <AppContainer className="space-y-6 pb-12">
        <Link href={`/app/${team.slug}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="size-4" aria-hidden /> Voltar para o início</Link>
        <section className="relative overflow-hidden rounded-[2rem] bg-grass p-6 text-white shadow-float sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-emerald-300"><Trophy className="size-6" aria-hidden /></span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Competição</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Campeonatos</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">Encontre uma competição, confira o andamento e continue exatamente de onde parou.</p>
          </div>
        </section>

        {canConfigure ? (
          <details className="app-surface group p-5 sm:p-7" open={openCreation}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-black text-graphite"><span className="flex items-center gap-3"><Plus className="size-5 text-emerald-700" aria-hidden /> Novo campeonato</span><span className="text-xs text-slate-400 group-open:hidden">Abrir</span></summary>
            <div className="mt-5 border-t border-slate-100 pt-5">
              {professionalSchedulingEnabled && !professionalConfigurationReady ? (
                <div className="text-center"><p className="font-black text-graphite">Defina as equipes padrão primeiro</p><p className="mt-2 text-sm leading-6 text-slate-600">Salve ao menos duas equipes internas e escolha os dois padrões antes do primeiro campeonato.</p><Link href={`/app/${team.slug}/settings`} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-black text-white">Abrir ajustes do time</Link></div>
              ) : <CreateChampionshipForm teamId={team.id} teamSlug={team.slug} professionalSchedulingEnabled={professionalSchedulingEnabled} internalSquads={internalConfiguration?.squads} />}
            </div>
          </details>
        ) : (
          <p className="app-surface flex items-start gap-3 p-4 text-sm text-slate-600"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden />Owner ou admin cria e publica. Você pode operar os confrontos já publicados.</p>
        )}

        {managementResult.mode === "enhanced" && parsedFilters.ok ? (
          <EnhancedChampionshipList teamSlug={team.slug} timeZone={team.timezone} filters={parsedFilters.filters} page={managementResult.page} canConfigure={canConfigure} />
        ) : managementResult.mode === "error" ? (
          <section aria-labelledby="championship-list-title"><h2 id="championship-list-title" className="sr-only">Campeonatos</h2><div role="alert" className="app-surface border-red-200 bg-red-50 p-8 text-center"><p className="font-black text-red-900">Não foi possível carregar</p><p className="mt-1 text-sm text-red-700">{parsedFilters.ok ? "Atualize a página e tente novamente." : parsedFilters.message}</p><Button asChild variant="outline" className="mt-5"><Link href={parsedFilters.ok ? buildManagementChampionshipListUrl(team.slug, filterBase(parsedFilters.filters), parsedFilters.filters.cursor) : `/app/${team.slug}/championships`}>Tentar novamente</Link></Button></div></section>
        ) : (
          <section aria-labelledby="championship-list-title">
            <div className="flex items-end justify-between gap-3"><div><p className="app-kicker">Área do time</p><h2 id="championship-list-title" className="mt-1 text-xl font-black text-graphite">Competições</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{legacyChampionships?.length ?? 0}</span></div>
            {legacyChampionships?.length ? <div className="mt-3 space-y-3">{legacyChampionships.map((championship) => <LegacyChampionshipCard key={championship.id} championship={championship} teamSlug={team.slug} />)}</div> : <div className="app-surface mt-3 border-dashed p-8 text-center"><Trophy className="mx-auto size-8 text-slate-300" aria-hidden /><p className="mt-3 font-black text-graphite">Nenhum campeonato ainda</p><p className="mt-1 text-sm text-slate-500">Crie o primeiro em cinco passos simples.</p></div>}
          </section>
        )}
      </AppContainer>
    </main>
  );
}
