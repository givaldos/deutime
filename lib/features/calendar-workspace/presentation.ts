export const calendarModes = ["list", "week", "month"] as const;

export type CalendarMode = (typeof calendarModes)[number];

export type CalendarPeriod = {
  mode: Exclude<CalendarMode, "list">;
  anchorDate: string;
  start: string;
  end: string;
  days: string[];
  previousAnchor: string;
  nextAnchor: string;
};

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || !date.toISOString().startsWith(value)
    ? null
    : date;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function mondayOnOrBefore(date: Date) {
  const weekday = date.getUTCDay();
  return addDays(date, -(weekday === 0 ? 6 : weekday - 1));
}

export function todayInTimeZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function parseCalendarSelection({
  mode,
  date,
  today,
}: {
  mode: string | null;
  date: string | null;
  today: string;
}): { ok: true; mode: CalendarMode; anchorDate: string } | { ok: false; message: string } {
  const selectedMode = mode || "list";
  if (!calendarModes.includes(selectedMode as CalendarMode)) {
    return { ok: false, message: "A visão de calendário informada não existe." };
  }
  const anchorDate = date || today;
  if (!parseIsoDate(anchorDate)) {
    return { ok: false, message: "A data do calendário não é válida." };
  }
  return { ok: true, mode: selectedMode as CalendarMode, anchorDate };
}

export function getCalendarPeriod(
  mode: Exclude<CalendarMode, "list">,
  anchorDate: string,
): CalendarPeriod {
  const anchor = parseIsoDate(anchorDate);
  if (!anchor) throw new Error("Data do calendário inválida.");

  let start: Date;
  let end: Date;
  let previousAnchor: Date;
  let nextAnchor: Date;
  if (mode === "week") {
    start = mondayOnOrBefore(anchor);
    end = addDays(start, 6);
    previousAnchor = addDays(anchor, -7);
    nextAnchor = addDays(anchor, 7);
  } else {
    const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    start = mondayOnOrBefore(monthStart);
    end = addDays(start, 41);
    previousAnchor = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1));
    nextAnchor = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
  }

  const days = Array.from(
    { length: Math.round((end.valueOf() - start.valueOf()) / 86_400_000) + 1 },
    (_, index) => isoDate(addDays(start, index)),
  );
  return {
    mode,
    anchorDate,
    start: isoDate(start),
    end: isoDate(end),
    days,
    previousAnchor: isoDate(previousAnchor),
    nextAnchor: isoDate(nextAnchor),
  };
}

export function calendarDayForInstant(value: string, timeZone: string) {
  return todayInTimeZone(timeZone, new Date(value));
}

export function groupCalendarItemsByDay<T extends { id: string; starts_at: string; ends_at: string }>(
  items: T[],
  timeZone: string,
) {
  const seen = new Set<string>();
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const firstDay = calendarDayForInstant(item.starts_at, timeZone);
    const inclusiveEnd = new Date(Math.max(
      new Date(item.starts_at).valueOf(),
      new Date(item.ends_at).valueOf() - 1,
    ));
    const lastDay = calendarDayForInstant(inclusiveEnd.toISOString(), timeZone);
    const first = parseIsoDate(firstDay);
    const last = parseIsoDate(lastDay);
    if (!first || !last) continue;
    for (let day = first; day <= last; day = addDays(day, 1)) {
      const key = isoDate(day);
      const occurrenceKey = `${key}:${item.id}`;
      if (seen.has(occurrenceKey)) continue;
      seen.add(occurrenceKey);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
  }
  return grouped;
}
