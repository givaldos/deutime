import "server-only";

import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const championshipStatuses = [
  "draft",
  "published",
  "active",
  "completed",
  "archived",
] as const;
const championshipFormats = ["league", "groups_knockout", "knockout"] as const;

export type ManagementChampionshipStatus = (typeof championshipStatuses)[number];
export type ManagementChampionshipFormat = (typeof championshipFormats)[number];

const cursorSchema = z.object({
  sort_at: z.string().min(1),
  id: z.uuid(),
}).strict();

const itemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  format: z.enum(championshipFormats),
  status: z.enum(championshipStatuses),
  status_label: z.string(),
  active_participants: z.number().int().nonnegative(),
  completed_fixtures: z.number().int().nonnegative(),
  total_fixtures: z.number().int().nonnegative(),
  next_action: z.string(),
  created_at: z.string(),
});

const pageSchema = z.object({
  items: z.array(itemSchema),
  filtered_count: z.number().int().nonnegative(),
  next_cursor: cursorSchema.nullable(),
  effective_filters: z.record(z.string(), z.unknown()),
});

export type ManagementChampionshipItem = z.infer<typeof itemSchema>;
export type ManagementChampionshipPage = z.infer<typeof pageSchema>;
export type ManagementChampionshipCursor = z.infer<typeof cursorSchema>;

export type ManagementChampionshipFilters = {
  status: ManagementChampionshipStatus | null;
  search: string | null;
  format: ManagementChampionshipFormat | null;
  createdStart: string | null;
  createdEnd: string | null;
  cursor: ManagementChampionshipCursor | null;
};

export type RawManagementChampionshipSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type ManagementChampionshipFilterParseResult =
  | { ok: true; filters: ManagementChampionshipFilters; openNew: boolean }
  | { ok: false; message: string };

function singleValue(
  query: RawManagementChampionshipSearchParams,
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

export function encodeManagementChampionshipCursor(
  cursor: ManagementChampionshipCursor,
) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeManagementChampionshipCursor(value: string) {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return cursorSchema.parse(decoded);
  } catch {
    return null;
  }
}

export function parseManagementChampionshipSearchParams(
  query: RawManagementChampionshipSearchParams,
): ManagementChampionshipFilterParseResult {
  const allowedKeys = new Set(["status", "q", "format", "from", "to", "cursor", "new"]);
  if (Object.keys(query).some((key) => !allowedKeys.has(key))) {
    return { ok: false, message: "Há um filtro desconhecido neste endereço." };
  }

  const rawValues = Object.fromEntries(
    [...allowedKeys].map((key) => [key, singleValue(query, key)]),
  );
  if (Object.values(rawValues).some((value) => value === undefined)) {
    return { ok: false, message: "Um filtro foi informado mais de uma vez." };
  }

  const status = rawValues.status || null;
  if (status && !championshipStatuses.includes(status as ManagementChampionshipStatus)) {
    return { ok: false, message: "A situação de campeonato informada não existe." };
  }

  const format = rawValues.format || null;
  if (format && !championshipFormats.includes(format as ManagementChampionshipFormat)) {
    return { ok: false, message: "O formato de campeonato informado não existe." };
  }

  const search = rawValues.q
    ? rawValues.q.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim()
    : null;
  if (rawValues.q && (!search || search.length < 2 || search.length > 80)) {
    return { ok: false, message: "A busca deve ter entre 2 e 80 caracteres." };
  }

  const createdStart = rawValues.from || null;
  const createdEnd = rawValues.to || null;
  if ((createdStart && !isIsoDate(createdStart)) || (createdEnd && !isIsoDate(createdEnd))) {
    return { ok: false, message: "Informe um período válido." };
  }
  if ((createdStart && !createdEnd) || (!createdStart && createdEnd) ||
      (createdStart && createdEnd && createdEnd < createdStart)) {
    return { ok: false, message: "Informe o início e o fim do período na ordem correta." };
  }

  const cursor = rawValues.cursor
    ? decodeManagementChampionshipCursor(rawValues.cursor)
    : null;
  if (rawValues.cursor && !cursor) {
    return { ok: false, message: "A página solicitada não é válida." };
  }

  if (rawValues.new && rawValues.new !== "1") {
    return { ok: false, message: "A ação solicitada não é válida." };
  }

  return {
    ok: true,
    openNew: rawValues.new === "1",
    filters: {
      status: status as ManagementChampionshipStatus | null,
      search,
      format: format as ManagementChampionshipFormat | null,
      createdStart,
      createdEnd,
      cursor,
    },
  };
}

const unavailableCodes = new Set(["P0001", "42883", "PGRST202"]);

export async function getManagementChampionshipPage(
  teamId: string,
  filters: ManagementChampionshipFilters,
): Promise<
  | { mode: "enhanced"; page: ManagementChampionshipPage }
  | { mode: "unavailable" }
  | { mode: "error" }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_management_championships", {
    requested_team_id: teamId,
    requested_status: filters.status ?? undefined,
    requested_search: filters.search ?? undefined,
    requested_format: filters.format ?? undefined,
    requested_created_start: filters.createdStart ?? undefined,
    requested_created_end: filters.createdEnd ?? undefined,
    requested_limit: 24,
    requested_cursor: (filters.cursor as Json | null) ?? undefined,
  });

  if (error) {
    if (unavailableCodes.has(error.code)) return { mode: "unavailable" };
    return { mode: "error" };
  }
  const parsed = pageSchema.safeParse(data);
  return parsed.success
    ? { mode: "enhanced", page: parsed.data }
    : { mode: "error" };
}

export function buildManagementChampionshipListUrl(
  teamSlug: string,
  filters: Omit<ManagementChampionshipFilters, "cursor">,
  cursor: ManagementChampionshipCursor | null = null,
) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("q", filters.search);
  if (filters.format) params.set("format", filters.format);
  if (filters.createdStart) params.set("from", filters.createdStart);
  if (filters.createdEnd) params.set("to", filters.createdEnd);
  if (cursor) params.set("cursor", encodeManagementChampionshipCursor(cursor));
  const query = params.toString();
  return `/app/${teamSlug}/championships${query ? `?${query}` : ""}`;
}

export function safeManagementChampionshipReturnTo(
  teamSlug: string,
  requestedReturnTo: string | string[] | undefined,
) {
  if (!requestedReturnTo || Array.isArray(requestedReturnTo)) return null;
  try {
    const parsed = new URL(requestedReturnTo, "https://deutime.invalid");
    const expectedPath = `/app/${teamSlug}/championships`;
    if (parsed.origin !== "https://deutime.invalid" ||
        parsed.pathname !== expectedPath || parsed.hash) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
