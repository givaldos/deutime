import "server-only";

import type { Database, Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const eventViews = ["upcoming", "reschedule", "completed", "cancelled"] as const;
const eventKinds = [
  "weekly_match",
  "championship",
  "friendly",
  "tournament",
  "training",
  "other",
] as const;

export type ManagementEventView = (typeof eventViews)[number];
export type ManagementEventKind = (typeof eventKinds)[number];

const cursorSchema = z.object({
  rank: z.number().int().min(0).max(1),
  sort_at: z.string().min(1),
  id: z.uuid(),
}).strict();

const linkedOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const managementEventItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  kind: z.enum(eventKinds),
  sport_format: z.enum(["field", "society", "futsal"]),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.enum(["scheduled", "cancelled", "completed"]),
  professional_schedule_state: z.enum([
    "scheduled",
    "pending_review",
    "date_tbd",
    "postponed",
  ]),
  venue_name: z.string().nullable(),
  confirmed_count: z.number().int().nonnegative(),
  attendance_count: z.number().int().nonnegative(),
  match_count: z.number().int().nonnegative(),
  championships: z.array(linkedOptionSchema),
  internal_teams: z.array(linkedOptionSchema.extend({ color: z.string() })),
  reschedule_reason: z.string().nullable(),
  next_action: z.string(),
});

const managementEventListSchema = z.object({
  items: z.array(managementEventItemSchema),
  filtered_count: z.number().int().nonnegative(),
  next_cursor: cursorSchema.nullable(),
  effective_filters: z.record(z.string(), z.unknown()),
});

const managementEventPageSchema = z.object({
  list: managementEventListSchema,
  filter_options: z.object({
    internal_teams: z.array(linkedOptionSchema.extend({ color: z.string() })),
    championships: z.array(linkedOptionSchema.extend({
      status: z.enum(["draft", "published", "active", "completed", "archived"]),
    })),
  }),
});

export type ManagementEventItem = z.infer<typeof managementEventItemSchema>;
export type ManagementEventPage = z.infer<typeof managementEventPageSchema>;
export type ManagementEventCursor = z.infer<typeof cursorSchema>;

export type ManagementEventFilters = {
  view: ManagementEventView;
  search: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  kind: ManagementEventKind | null;
  internalTeamId: string | null;
  championshipId: string | null;
  cursor: ManagementEventCursor | null;
};

export type RawManagementEventSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type ManagementEventFilterParseResult =
  | { ok: true; filters: ManagementEventFilters }
  | { ok: false; message: string };

function singleValue(
  query: RawManagementEventSearchParams,
  key: string,
): string | null | undefined {
  const value = query[key];
  if (Array.isArray(value)) return undefined;
  return value ?? null;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function encodeManagementEventCursor(cursor: ManagementEventCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeManagementEventCursor(value: string) {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return cursorSchema.parse(decoded);
  } catch {
    return null;
  }
}

export function parseManagementEventSearchParams(
  query: RawManagementEventSearchParams,
): ManagementEventFilterParseResult {
  const allowedKeys = new Set([
    "view", "q", "from", "to", "kind", "team", "championship", "cursor",
  ]);
  if (Object.keys(query).some((key) => !allowedKeys.has(key))) {
    return { ok: false, message: "Há um filtro desconhecido neste endereço." };
  }

  const rawValues = Object.fromEntries(
    [...allowedKeys].map((key) => [key, singleValue(query, key)]),
  );
  if (Object.values(rawValues).some((value) => value === undefined)) {
    return { ok: false, message: "Um filtro foi informado mais de uma vez." };
  }

  const view = rawValues.view || "upcoming";
  if (!eventViews.includes(view as ManagementEventView)) {
    return { ok: false, message: "A visão de jogos informada não existe." };
  }

  const search = rawValues.q
    ? rawValues.q.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim()
    : null;
  if (rawValues.q && (!search || search.length < 2 || search.length > 80)) {
    return { ok: false, message: "A busca deve ter entre 2 e 80 caracteres." };
  }

  const periodStart = rawValues.from || null;
  const periodEnd = rawValues.to || null;
  if ((periodStart && !isIsoDate(periodStart)) || (periodEnd && !isIsoDate(periodEnd))) {
    return { ok: false, message: "Informe um período válido." };
  }
  if ((periodStart && !periodEnd) || (!periodStart && periodEnd) ||
      (periodStart && periodEnd && periodEnd < periodStart)) {
    return { ok: false, message: "Informe o início e o fim do período na ordem correta." };
  }

  const kind = rawValues.kind || null;
  if (kind && !eventKinds.includes(kind as ManagementEventKind)) {
    return { ok: false, message: "O tipo de jogo informado não existe." };
  }

  const internalTeamId = rawValues.team || null;
  const championshipId = rawValues.championship || null;
  if ((internalTeamId && !isUuid(internalTeamId)) ||
      (championshipId && !isUuid(championshipId))) {
    return { ok: false, message: "Uma opção de filtro não é válida para este time." };
  }

  const cursor = rawValues.cursor
    ? decodeManagementEventCursor(rawValues.cursor)
    : null;
  if (rawValues.cursor && !cursor) {
    return { ok: false, message: "A página solicitada não é válida." };
  }

  return {
    ok: true,
    filters: {
      view: view as ManagementEventView,
      search,
      periodStart,
      periodEnd,
      kind: kind as ManagementEventKind | null,
      internalTeamId,
      championshipId,
      cursor,
    },
  };
}

const unavailableCodes = new Set(["P0001", "42883", "PGRST202"]);

export async function getManagementEventPage(
  teamId: string,
  filters: ManagementEventFilters,
): Promise<
  | { mode: "enhanced"; page: ManagementEventPage }
  | { mode: "unavailable" }
  | { mode: "error" }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_management_event_page", {
    requested_team_id: teamId,
    requested_view: filters.view,
    requested_search: filters.search ?? undefined,
    requested_period_start: filters.periodStart ?? undefined,
    requested_period_end: filters.periodEnd ?? undefined,
    requested_kind: filters.kind ?? undefined,
    requested_internal_team_id: filters.internalTeamId ?? undefined,
    requested_championship_id: filters.championshipId ?? undefined,
    requested_limit: 24,
    requested_cursor: (filters.cursor as Json | null) ?? undefined,
  });

  if (error) {
    if (unavailableCodes.has(error.code)) return { mode: "unavailable" };
    console.warn("[management-lists] events_rpc_error", { code: error.code });
    return { mode: "error" };
  }

  const parsed = managementEventPageSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("[management-lists] events_invalid_response", {
      paths: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
  }
  return parsed.success
    ? { mode: "enhanced", page: parsed.data }
    : { mode: "error" };
}

export type LegacyEvent = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  | "id"
  | "title"
  | "kind"
  | "organization_mode"
  | "sport_format"
  | "starts_at"
  | "ends_at"
  | "status"
  | "professional_schedule_state"
  | "opponent_name"
  | "venue_id"
>;

export type LegacyManagementEventPage = {
  events: LegacyEvent[];
  attendanceByEvent: Map<string, { total: number; confirmed: number }>;
  venueById: Map<string, string>;
};

export async function getLegacyManagementEventPage(
  teamId: string,
): Promise<LegacyManagementEventPage> {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, kind, organization_mode, sport_format, starts_at, ends_at, status, professional_schedule_state, opponent_name, venue_id")
    .eq("team_id", teamId)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (error) throw new Error("Não foi possível carregar os jogos.");

  const typedEvents = events ?? [];
  const eventIds = typedEvents.map((event) => event.id);
  const venueIds = [...new Set(typedEvents.flatMap((event) => event.venue_id ? [event.venue_id] : []))];
  const [{ data: attendance }, { data: venues }] = await Promise.all([
    eventIds.length
      ? supabase.from("event_attendance").select("event_id, status").in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    venueIds.length
      ? supabase.from("venues").select("id, name").in("id", venueIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const attendanceByEvent = new Map<string, { total: number; confirmed: number }>();
  for (const response of attendance ?? []) {
    const current = attendanceByEvent.get(response.event_id) ?? { total: 0, confirmed: 0 };
    current.total += 1;
    if (response.status === "confirmed") current.confirmed += 1;
    attendanceByEvent.set(response.event_id, current);
  }

  return {
    events: typedEvents,
    attendanceByEvent,
    venueById: new Map((venues ?? []).map((venue) => [venue.id, venue.name])),
  };
}

export function buildManagementEventListUrl(
  teamSlug: string,
  filters: Omit<ManagementEventFilters, "cursor">,
  cursor: ManagementEventCursor | null = null,
) {
  const params = new URLSearchParams();
  if (filters.view !== "upcoming") params.set("view", filters.view);
  if (filters.search) params.set("q", filters.search);
  if (filters.periodStart) params.set("from", filters.periodStart);
  if (filters.periodEnd) params.set("to", filters.periodEnd);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.internalTeamId) params.set("team", filters.internalTeamId);
  if (filters.championshipId) params.set("championship", filters.championshipId);
  if (cursor) params.set("cursor", encodeManagementEventCursor(cursor));
  const query = params.toString();
  return `/app/${teamSlug}/events${query ? `?${query}` : ""}`;
}

export function safeManagementEventReturnTo(
  teamSlug: string,
  requestedReturnTo: string | string[] | undefined,
) {
  if (!requestedReturnTo || Array.isArray(requestedReturnTo)) return null;
  try {
    const parsed = new URL(requestedReturnTo, "https://deutime.invalid");
    const expectedPath = `/app/${teamSlug}/events`;
    if (parsed.origin !== "https://deutime.invalid" || parsed.pathname !== expectedPath || parsed.hash) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
