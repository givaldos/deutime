import { Button } from "@/components/ui/button";
import type { ManagementCalendar, ManagementCalendarItem } from "@/lib/data/management-calendar";
import type { ManagementEventFilters } from "@/lib/data/management-events";
import {
  type CalendarMode,
  type CalendarPeriod,
  groupCalendarItemsByDay,
} from "@/lib/features/calendar-workspace/presentation";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

const kindLabels: Record<ManagementCalendarItem["kind"], string> = {
  weekly_match: "Racha semanal",
  championship: "Campeonato",
  friendly: "Amistoso",
  tournament: "Torneio",
  training: "Treino",
  other: "Outro",
};

function calendarUrl(
  teamSlug: string,
  filters: ManagementEventFilters,
  mode: CalendarMode,
  date: string,
) {
  const params = new URLSearchParams();
  if (mode !== "list") params.set("mode", mode);
  if (mode !== "list") params.set("date", date);
  if (filters.search) params.set("q", filters.search);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.internalTeamId) params.set("team", filters.internalTeamId);
  if (filters.championshipId) params.set("championship", filters.championshipId);
  const query = params.toString();
  return `/app/${teamSlug}/events${query ? `?${query}` : ""}`;
}

function dateLabel(value: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone }).format(
    new Date(`${value}T12:00:00.000Z`),
  );
}

function timeLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function EventSummary({
  event,
  teamSlug,
  timeZone,
  returnTo,
  compact = false,
}: {
  event: ManagementCalendarItem;
  teamSlug: string;
  timeZone: string;
  returnTo: string;
  compact?: boolean;
}) {
  const detail = `/app/${teamSlug}/events/${event.id}?${new URLSearchParams({ returnTo })}`;
  return (
    <Link
      href={detail}
      className={`block rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${compact ? "p-2" : "p-3"}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">
        {kindLabels[event.kind]}
      </p>
      <p className={`mt-0.5 font-black text-graphite ${compact ? "truncate text-xs" : "text-sm"}`}>
        {event.title}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
        <Clock3 className="size-3.5" aria-hidden /> {timeLabel(event.starts_at, timeZone)}
      </p>
      {!compact && event.venue_name ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="size-3.5" aria-hidden /> {event.venue_name}
        </p>
      ) : null}
      {event.pending_conflict_count > 0 ? (
        <p className={`mt-2 flex items-center gap-1 text-[11px] font-black ${event.highest_severity === "hard" ? "text-red-700" : "text-amber-800"}`}>
          <AlertTriangle className="size-3.5" aria-hidden />
          {event.pending_conflict_count} {event.pending_conflict_count === 1 ? "conflito" : "conflitos"}
        </p>
      ) : null}
    </Link>
  );
}

export function CalendarModeNavigation({
  teamSlug,
  filters,
  mode,
  anchorDate,
}: {
  teamSlug: string;
  filters: ManagementEventFilters;
  mode: CalendarMode;
  anchorDate: string;
}) {
  const labels: Record<CalendarMode, string> = { list: "Lista", week: "Semana", month: "Mês" };
  return (
    <nav aria-label="Formato da agenda" className="mb-4 grid grid-cols-3 gap-2">
      {(["list", "week", "month"] as CalendarMode[]).map((item) => (
        <Link
          key={item}
          href={calendarUrl(teamSlug, filters, item, anchorDate)}
          aria-current={mode === item ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${mode === item ? "bg-grass text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}
        >
          {labels[item]}
        </Link>
      ))}
    </nav>
  );
}

export function ManagementCalendarView({
  teamSlug,
  timeZone,
  today,
  filters,
  period,
  calendar,
}: {
  teamSlug: string;
  timeZone: string;
  today: string;
  filters: ManagementEventFilters;
  period: CalendarPeriod;
  calendar: ManagementCalendar;
}) {
  const grouped = groupCalendarItemsByDay(calendar.items, timeZone);
  const currentUrl = calendarUrl(teamSlug, filters, period.mode, period.anchorDate);
  const daysWithItems = period.days.filter((day) => (grouped.get(day)?.length ?? 0) > 0);
  const title = period.mode === "week"
    ? `${dateLabel(period.start, timeZone, { day: "2-digit", month: "short" })} a ${dateLabel(period.end, timeZone, { day: "2-digit", month: "short", year: "numeric" })}`
    : dateLabel(period.anchorDate, timeZone, { month: "long", year: "numeric" });

  return (
    <section aria-labelledby="calendar-title">
      <div className="app-surface mb-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="app-kicker">Agenda do time</p>
            <h2 id="calendar-title" className="mt-1 text-xl font-black capitalize text-graphite">{title}</h2>
            <p aria-live="polite" className="mt-1 text-xs font-semibold text-slate-500">
              {calendar.summary.scheduled_count} {calendar.summary.scheduled_count === 1 ? "compromisso" : "compromissos"}
              {calendar.summary.conflict_count ? ` · ${calendar.summary.conflict_count} conflitos` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" aria-label="Período anterior">
              <Link href={calendarUrl(teamSlug, filters, period.mode, period.previousAnchor)}><ChevronLeft aria-hidden /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={calendarUrl(teamSlug, filters, period.mode, today)}>Hoje</Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Próximo período">
              <Link href={calendarUrl(teamSlug, filters, period.mode, period.nextAnchor)}><ChevronRight aria-hidden /></Link>
            </Button>
          </div>
        </div>
      </div>

      {calendar.truncated ? (
        <p role="alert" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">
          Este período tem mais de 200 compromissos. Use os filtros ou a Lista para consultar todos.
        </p>
      ) : null}

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 lg:grid lg:grid-cols-7 lg:gap-px">
        {period.days.slice(0, 7).map((day) => (
          <div key={`weekday-${day}`} className="bg-slate-50 px-2 py-2 text-center text-xs font-black uppercase text-slate-600">
            {dateLabel(day, timeZone, { weekday: "short" })}
          </div>
        ))}
        {period.days.map((day) => {
          const items = grouped.get(day) ?? [];
          const isToday = day === today;
          return (
            <section key={day} aria-label={dateLabel(day, timeZone, { dateStyle: "full" })} className="min-h-32 bg-white p-2">
              <p className={`mb-2 grid size-7 place-items-center rounded-full text-xs font-black ${isToday ? "bg-grass text-white" : "text-slate-600"}`}>
                {dateLabel(day, timeZone, { day: "2-digit" })}
              </p>
              <div className="space-y-1.5">
                {items.slice(0, 3).map((event) => (
                  <EventSummary key={`${day}-${event.id}`} event={event} teamSlug={teamSlug} timeZone={timeZone} returnTo={currentUrl} compact />
                ))}
                {items.length > 3 ? <p className="px-1 text-[11px] font-bold text-slate-500">+ {items.length - 3} neste dia</p> : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className="space-y-5 lg:hidden" aria-label="Agenda por dia">
        {daysWithItems.length ? daysWithItems.map((day) => (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h3 id={`day-${day}`} className="mb-2 text-sm font-black capitalize text-graphite">
              {dateLabel(day, timeZone, { weekday: "long", day: "2-digit", month: "long" })}
            </h3>
            <div className="grid gap-2">
              {(grouped.get(day) ?? []).map((event) => (
                <EventSummary key={`${day}-${event.id}`} event={event} teamSlug={teamSlug} timeZone={timeZone} returnTo={currentUrl} />
              ))}
            </div>
          </section>
        )) : (
          <div className="app-surface border-dashed p-8 text-center">
            <CalendarDays className="mx-auto size-8 text-slate-400" aria-hidden />
            <p className="mt-3 font-black text-graphite">Nenhum compromisso neste período</p>
            <p className="mt-1 text-sm text-slate-500">Mude o período ou ajuste os filtros.</p>
          </div>
        )}
      </div>

      {calendar.reschedule_items.length ? (
        <section className="mt-8" aria-labelledby="reschedule-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker">Fora das datas antigas</p>
              <h2 id="reschedule-title" className="mt-1 text-xl font-black text-graphite">A reagendar</h2>
            </div>
            <Button asChild variant="outline"><Link href={`/app/${teamSlug}/events?view=reschedule`}>Ver todos</Link></Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {calendar.reschedule_items.map((event) => (
              <article key={event.id} className="app-surface p-4">
                <p className="text-xs font-black uppercase text-amber-800">{event.reason}</p>
                <h3 className="mt-1 font-black text-graphite">{event.title}</h3>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={`/app/${teamSlug}/events/${event.id}/edit`}>Reagendar</Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {calendar.summary.conflict_count ? (
        <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
          <Link href={`/app/${teamSlug}/events/pending`}><AlertTriangle aria-hidden />Ver conflitos da agenda</Link>
        </Button>
      ) : null}

      {!calendar.items.length && !calendar.reschedule_items.length ? (
        <Button asChild variant="ghost" className="mt-4">
          <Link href={calendarUrl(teamSlug, { ...filters, search: null, kind: null, internalTeamId: null, championshipId: null }, period.mode, today)}>
            <RotateCcw aria-hidden />Limpar filtros e voltar para hoje
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
