import { Button } from "@/components/ui/button";
import { AppContainer, PageHeader } from "@/components/ui/app-shell";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/dal";
import {
  buildManagementEventListUrl,
  getLegacyManagementEventPage,
  getManagementEventPage,
  parseManagementEventSearchParams,
  type LegacyEvent,
  type ManagementEventFilters,
  type ManagementEventItem,
  type ManagementEventKind,
  type ManagementEventPage,
  type ManagementEventView,
  type RawManagementEventSearchParams,
} from "@/lib/data/management-events";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays, CheckCircle2, ChevronRight, Clock3, Filter, MapPin,
  Plus, RotateCcw, Search, Trophy, UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const kindLabels: Record<ManagementEventKind, string> = {
  weekly_match: "Racha semanal",
  championship: "Campeonato",
  friendly: "Amistoso",
  tournament: "Torneio",
  training: "Treino",
  other: "Outro",
};
const viewLabels: Record<ManagementEventView, string> = {
  upcoming: "Próximos",
  reschedule: "A reagendar",
  completed: "Encerrados",
  cancelled: "Cancelados",
};
const formatLabels = { field: "Campo", society: "Society", futsal: "Futsal" };

function formatDate(value: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone }).format(new Date(value));
}

function eventDetailHref(teamSlug: string, eventId: string, returnTo: string) {
  return `/app/${teamSlug}/events/${eventId}?${new URLSearchParams({ returnTo })}`;
}

function EnhancedEventCard({ event, teamSlug, timeZone, returnTo }: {
  event: ManagementEventItem;
  teamSlug: string;
  timeZone: string;
  returnTo: string;
}) {
  const hasTrustedDate = !["date_tbd", "postponed"].includes(event.professional_schedule_state);
  const progress = event.attendance_count
    ? Math.round((event.confirmed_count / event.attendance_count) * 100)
    : 0;
  return (
    <Link href={eventDetailHref(teamSlug, event.id, returnTo)} className="app-surface app-interactive group block p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        {hasTrustedDate ? (
          <div className="min-w-14 rounded-2xl bg-grass px-2 py-2.5 text-center text-white shadow-sm">
            <p className="text-[10px] font-bold uppercase text-emerald-300">{formatDate(event.starts_at, timeZone, { month: "short" }).replace(".", "")}</p>
            <p className="text-xl font-black">{formatDate(event.starts_at, timeZone, { day: "2-digit" })}</p>
          </div>
        ) : (
          <div className="flex min-h-14 min-w-14 flex-col items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <CalendarDays className="size-5" aria-hidden /><span className="mt-0.5 text-[9px] font-black uppercase">Pendente</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-700">{kindLabels[event.kind]} · {formatLabels[event.sport_format]}</p>
              <h2 className="mt-1 truncate text-base font-black tracking-tight text-graphite">{event.title}</h2>
              {event.reschedule_reason ? (
                <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">{event.reschedule_reason}</span>
              ) : event.professional_schedule_state === "pending_review" ? (
                <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">Revisão necessária</span>
              ) : null}
            </div>
            <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:text-emerald-700" aria-hidden />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
            {hasTrustedDate ? <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden />{formatDate(event.starts_at, timeZone, { hour: "2-digit", minute: "2-digit" })}</span> : null}
            {event.venue_name ? <span className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden />{event.venue_name}</span> : null}
            <span className="flex items-center gap-1.5"><UsersRound className="size-3.5" aria-hidden />{event.confirmed_count}/{event.attendance_count} confirmados</span>
            {event.match_count ? <span className="flex items-center gap-1.5"><Trophy className="size-3.5" aria-hidden />{event.match_count} {event.match_count === 1 ? "partida" : "partidas"}</span> : null}
          </div>
          {event.championships.length || event.internal_teams.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {event.championships.map((item) => <span key={item.id} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">{item.name}</span>)}
              {event.internal_teams.map((item) => <span key={item.id} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{item.name}</span>)}
            </div>
          ) : null}
          <div className="mt-4 flex items-center gap-3">
            <Progress className="h-1.5 flex-1" label={`Confirmações para ${event.title}`} value={progress} />
            <span className="text-[10px] font-bold text-slate-400">{event.next_action}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function withoutCursor(filters: ManagementEventFilters) {
  return {
    view: filters.view,
    search: filters.search,
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
    kind: filters.kind,
    internalTeamId: filters.internalTeamId,
    championshipId: filters.championshipId,
  };
}

function EventFilters({ teamSlug, filters, options }: {
  teamSlug: string;
  filters: ManagementEventFilters;
  options: ManagementEventPage["filter_options"];
}) {
  const clearUrl = buildManagementEventListUrl(teamSlug, {
    view: filters.view, search: null, periodStart: null, periodEnd: null,
    kind: null, internalTeamId: null, championshipId: null,
  });
  return (
    <form action={`/app/${teamSlug}/events`} method="get" className="app-surface mb-6 p-4 sm:p-5">
      <input type="hidden" name="view" value={filters.view} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Filter className="size-4 text-emerald-700" aria-hidden /><h2 className="text-sm font-black text-graphite">Encontrar jogos</h2></div>
        <Link href={clearUrl} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold text-slate-600 hover:text-emerald-800"><RotateCcw className="size-3.5" aria-hidden />Limpar filtros</Link>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Título ou adversário</span><span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" aria-hidden /><input name="q" type="search" minLength={2} maxLength={80} defaultValue={filters.search ?? ""} placeholder="Ex.: final ou nome do adversário" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></span></label>
        <label><span className="text-xs font-bold text-slate-600">De</span><input name="from" type="date" defaultValue={filters.periodStart ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></label>
        <label><span className="text-xs font-bold text-slate-600">Até</span><input name="to" type="date" defaultValue={filters.periodEnd ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></label>
        <label><span className="text-xs font-bold text-slate-600">Tipo</span><select name="kind" defaultValue={filters.kind ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"><option value="">Todos</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="text-xs font-bold text-slate-600">Equipe</span><select name="team" defaultValue={filters.internalTeamId ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"><option value="">Todas</option>{options.internal_teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Campeonato</span><select name="championship" defaultValue={filters.championshipId ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"><option value="">Todos</option>{options.championships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <Button type="submit" className="mt-4 w-full sm:w-auto"><Search aria-hidden />Aplicar filtros</Button>
    </form>
  );
}

function EnhancedEventList({ teamSlug, timeZone, filters, page }: {
  teamSlug: string;
  timeZone: string;
  filters: ManagementEventFilters;
  page: ManagementEventPage;
}) {
  const filterBase = withoutCursor(filters);
  const listUrl = buildManagementEventListUrl(teamSlug, filterBase, filters.cursor);
  const hasFilters = Boolean(filters.search || filters.periodStart || filters.kind || filters.internalTeamId || filters.championshipId);
  const clearUrl = buildManagementEventListUrl(teamSlug, { view: filters.view, search: null, periodStart: null, periodEnd: null, kind: null, internalTeamId: null, championshipId: null });
  return <>
    <nav aria-label="Visões de jogos" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(Object.keys(viewLabels) as ManagementEventView[]).map((view) => {
        const active = filters.view === view;
        return <Link key={view} href={buildManagementEventListUrl(teamSlug, { ...filterBase, view })} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-center text-sm font-black transition ${active ? "bg-grass text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800"}`}>{viewLabels[view]}</Link>;
      })}
    </nav>
    <EventFilters teamSlug={teamSlug} filters={filters} options={page.filter_options} />
    <div className="mb-3 flex items-end justify-between gap-3"><div><p className="app-kicker">{viewLabels[filters.view]}</p><h2 className="mt-1 text-xl font-black tracking-tight">Jogos encontrados</h2></div><p aria-live="polite" className="text-sm font-bold text-slate-600">{page.list.filtered_count} {page.list.filtered_count === 1 ? "jogo" : "jogos"}</p></div>
    {page.list.items.length ? <div className="grid gap-3 lg:grid-cols-2">{page.list.items.map((event) => <EnhancedEventCard key={event.id} event={event} teamSlug={teamSlug} timeZone={timeZone} returnTo={listUrl} />)}</div> : (
      <div className="app-surface border-dashed p-8 text-center"><CalendarDays className="mx-auto size-8 text-slate-400" aria-hidden /><p className="mt-3 font-semibold">{hasFilters ? "Nenhum resultado com estes filtros" : `Nenhum jogo em ${viewLabels[filters.view].toLowerCase()}`}</p><p className="mt-1 text-sm text-slate-500">{hasFilters ? "Ajuste a busca ou limpe os filtros para tentar novamente." : "Os jogos aparecerão aqui quando estiverem disponíveis."}</p>{hasFilters ? <Button asChild variant="outline" className="mt-5"><Link href={clearUrl}>Limpar filtros</Link></Button> : filters.view === "upcoming" ? <Button asChild className="mt-5"><Link href={`/app/${teamSlug}/events/new`}>Criar primeiro jogo</Link></Button> : null}</div>
    )}
    {page.list.next_cursor ? <div className="mt-6 flex justify-center"><Button asChild variant="outline"><Link href={buildManagementEventListUrl(teamSlug, filterBase, page.list.next_cursor)}>Próxima página<ChevronRight aria-hidden /></Link></Button></div> : null}
  </>;
}

function LegacyEventCard({ event, teamSlug, timeZone, attendance, venueName }: {
  event: LegacyEvent;
  teamSlug: string;
  timeZone: string;
  attendance: { total: number; confirmed: number };
  venueName: string | undefined;
}) {
  const progress = attendance.total ? Math.round((attendance.confirmed / attendance.total) * 100) : 0;
  return <Link href={`/app/${teamSlug}/events/${event.id}`} className="app-surface app-interactive group block p-4 sm:p-5"><div className="flex items-start gap-4"><div className="min-w-14 rounded-2xl bg-grass px-2 py-2.5 text-center text-white shadow-sm"><p className="text-[10px] font-bold uppercase text-emerald-300">{formatDate(event.starts_at, timeZone, { month: "short" }).replace(".", "")}</p><p className="text-xl font-black">{formatDate(event.starts_at, timeZone, { day: "2-digit" })}</p></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold text-emerald-700">{kindLabels[event.kind]} · {formatLabels[event.sport_format]}</p><h2 className="mt-1 truncate text-base font-black tracking-tight text-graphite">{event.title}</h2></div><ChevronRight className="size-5 shrink-0 text-slate-300" aria-hidden /></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden />{formatDate(event.starts_at, timeZone, { hour: "2-digit", minute: "2-digit" })}</span>{venueName ? <span className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden />{venueName}</span> : null}<span className="flex items-center gap-1.5"><UsersRound className="size-3.5" aria-hidden />{attendance.confirmed}/{attendance.total} confirmados</span></div><div className="mt-4 flex items-center gap-3"><Progress className="h-1.5 flex-1" label={`Confirmações para ${event.title}`} value={progress} /><span className="text-[10px] font-bold text-slate-400">{progress}%</span></div></div></div></Link>;
}

export default async function EventsPage({ params, searchParams }: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<RawManagementEventSearchParams>;
}) {
  const user = await requireUser();
  const [{ teamSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id, name, slug, timezone").eq("slug", teamSlug).maybeSingle();
  if (!team) notFound();
  const { data: membership } = await supabase.from("team_memberships").select("role").eq("team_id", team.id).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!membership) notFound();

  const parsedFilters = parseManagementEventSearchParams(query);
  const managementResult = parsedFilters.ok ? await getManagementEventPage(team.id, parsedFilters.filters) : { mode: "error" as const };
  const [professionalSchedulingEnabled, legacyPage] = await Promise.all([
    isTeamFeatureEnabled(team.id, "professional_scheduling"),
    managementResult.mode === "unavailable" ? getLegacyManagementEventPage(team.id) : Promise.resolve(null),
  ]);
  const { count: pendingConflictCount } = professionalSchedulingEnabled
    ? await supabase.from("event_schedule_conflicts").select("id", { count: "exact", head: true }).eq("team_id", team.id).eq("status", "pending")
    : { count: 0 };
  const newEventAction = <Button asChild><Link href={`/app/${team.slug}/events/new`}><Plus aria-hidden /><span className="hidden sm:inline">Novo jogo</span><span className="sm:hidden">Novo</span></Link></Button>;

  if (managementResult.mode === "enhanced" && parsedFilters.ok) {
    return <main className="app-canvas pb-24"><AppContainer><PageHeader eyebrow="Organização" title="Jogos" description="Encontre compromissos, pendências e resultados sem perder o contexto." action={newEventAction} />{professionalSchedulingEnabled ? <Link href={`/app/${team.slug}/events/pending`} className="-mt-3 mb-6 flex min-h-12 items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-950"><span>Pendências e decisões da agenda</span><span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs">{pendingConflictCount ?? 0}</span></Link> : null}<EnhancedEventList teamSlug={team.slug} timeZone={team.timezone} filters={parsedFilters.filters} page={managementResult.page} /></AppContainer></main>;
  }
  if (managementResult.mode === "error") {
    return <main className="app-canvas pb-24"><AppContainer><PageHeader eyebrow="Organização" title="Jogos" description="Encontre compromissos, pendências e resultados sem perder o contexto." action={newEventAction} /><div role="alert" className="app-surface border-red-200 bg-red-50 p-8 text-center"><p className="font-black text-red-900">Não foi possível carregar</p><p className="mt-1 text-sm text-red-700">{parsedFilters.ok ? "Atualize a página e tente novamente." : parsedFilters.message}</p><Button asChild variant="outline" className="mt-5"><Link href={`/app/${team.slug}/events`}>Tentar novamente</Link></Button></div></AppContainer></main>;
  }

  const events = legacyPage?.events ?? [];
  const now = new Date().toISOString();
  const upcoming = events.filter((event) => event.status === "scheduled" && ["scheduled", "pending_review"].includes(event.professional_schedule_state) && event.starts_at >= now);
  const awaitingDate = events.filter((event) => event.status === "scheduled" && ["date_tbd", "postponed"].includes(event.professional_schedule_state));
  const history = events.filter((event) => event.status !== "scheduled" || (event.starts_at < now && !["date_tbd", "postponed"].includes(event.professional_schedule_state))).reverse();
  const renderLegacyEvent = (event: LegacyEvent) => <LegacyEventCard key={event.id} event={event} teamSlug={team.slug} timeZone={team.timezone} attendance={legacyPage?.attendanceByEvent.get(event.id) ?? { total: 0, confirmed: 0 }} venueName={event.venue_id ? legacyPage?.venueById.get(event.venue_id) : undefined} />;
  return <main className="app-canvas pb-24"><AppContainer><PageHeader eyebrow="Organização" title="Agenda" description={`${upcoming.length} próximo${upcoming.length === 1 ? " evento" : "s eventos"} · acompanhe chamadas e súmulas em um só lugar.`} action={newEventAction} />{professionalSchedulingEnabled ? <Link href={`/app/${team.slug}/events/pending`} className="-mt-3 mb-6 flex min-h-12 items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-950"><span>Pendências e decisões da agenda</span><span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs">{pendingConflictCount ?? 0}</span></Link> : null}<section><p className="app-kicker">Em aberto</p><h2 className="mt-1 text-xl font-black tracking-tight">Próximos jogos</h2>{upcoming.length ? <div className="mt-3 grid gap-3 lg:grid-cols-2">{upcoming.map(renderLegacyEvent)}</div> : <div className="app-surface mt-3 border-dashed p-8 text-center"><CalendarDays className="mx-auto size-8 text-slate-400" aria-hidden /><p className="mt-3 font-semibold">Nenhum jogo agendado</p><p className="mt-1 text-sm text-slate-500">Crie um evento avulso ou uma sequência semanal.</p><Button asChild className="mt-5"><Link href={`/app/${team.slug}/events/new`}>Criar primeiro evento</Link></Button></div>}</section>{awaitingDate.length ? <section><div className="flex items-center gap-2"><CalendarDays className="size-5 text-amber-700" aria-hidden /><h2 className="text-lg font-black tracking-tight">Aguardando nova data</h2></div><div className="mt-3 grid gap-3 lg:grid-cols-2">{awaitingDate.map(renderLegacyEvent)}</div></section> : null}{history.length ? <section><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-slate-500" aria-hidden /><h2 className="text-lg font-black tracking-tight">Histórico</h2></div><div className="mt-3 grid gap-3 lg:grid-cols-2">{history.map(renderLegacyEvent)}</div></section> : null}</AppContainer></main>;
}
