import "server-only";

import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const athleteStatuses = ["active", "inactive", "pending", "rejected"] as const;

export type ManagementAthleteStatus = (typeof athleteStatuses)[number];

const cursorSchema = z.object({
  sort_name: z.string().min(2).max(120),
  id: z.uuid(),
}).strict();

const positionSchema = z.object({
  sport_format: z.enum(["field", "society", "futsal"]),
  code: z.string(),
  label: z.string(),
  priority: z.number().int().min(1).max(3),
});

const managementAthleteItemSchema = z.object({
  id: z.uuid(),
  registration_number: z.number().int().positive(),
  claimed: z.boolean(),
  display_name: z.string().min(2),
  full_name: z.string().min(2),
  shirt_number: z.number().int().min(1).max(99).nullable(),
  status: z.enum(athleteStatuses),
  positions: z.array(positionSchema),
  photo_source: z.enum(["player_profile", "team_registration"]).nullable(),
  photo_path: z.string().nullable(),
  allowed_actions: z.object({
    can_review: z.boolean(),
    can_edit: z.boolean(),
    can_remove: z.boolean(),
  }),
});

const managementAthleteListSchema = z.object({
  items: z.array(managementAthleteItemSchema),
  filtered_count: z.number().int().nonnegative(),
  pending_count: z.number().int().nonnegative(),
  next_cursor: cursorSchema.nullable(),
  effective_filters: z.record(z.string(), z.unknown()),
});

export type ManagementAthleteCursor = z.infer<typeof cursorSchema>;
export type ManagementAthleteItem = Omit<
  z.infer<typeof managementAthleteItemSchema>,
  "photo_path"
> & { photo_url: string | null };

export type ManagementAthleteFilters = {
  status: ManagementAthleteStatus;
  search: string | null;
  positionCode: string | null;
  cursor: ManagementAthleteCursor | null;
};

export type ManagementAthletePage = {
  items: ManagementAthleteItem[];
  filteredCount: number;
  pendingCount: number;
  nextCursor: ManagementAthleteCursor | null;
  positions: Array<{ code: string; label: string }>;
};

export type RawManagementAthleteSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type ManagementAthleteFilterParseResult =
  | { ok: true; filters: ManagementAthleteFilters }
  | { ok: false; message: string };

const feedbackKeys = [
  "created",
  "updated",
  "removed",
  "removeError",
  "reviewed",
  "reviewError",
  "availability",
  "availabilityError",
  "view",
] as const;

function singleValue(
  query: RawManagementAthleteSearchParams,
  key: string,
): string | null | undefined {
  const value = query[key];
  if (Array.isArray(value)) return undefined;
  return value ?? null;
}

export function encodeManagementAthleteCursor(cursor: ManagementAthleteCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeManagementAthleteCursor(value: string) {
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
}

export function parseManagementAthleteSearchParams(
  query: RawManagementAthleteSearchParams,
): ManagementAthleteFilterParseResult {
  const filterKeys = ["status", "q", "position", "cursor"] as const;
  const allowedKeys = new Set<string>([...filterKeys, ...feedbackKeys]);
  if (Object.keys(query).some((key) => !allowedKeys.has(key))) {
    return { ok: false, message: "Há um filtro desconhecido neste endereço." };
  }

  const raw = Object.fromEntries(
    filterKeys.map((key) => [key, singleValue(query, key)]),
  ) as Record<(typeof filterKeys)[number], string | null | undefined>;
  if (Object.values(raw).some((value) => value === undefined)) {
    return { ok: false, message: "Um filtro foi informado mais de uma vez." };
  }

  const status = raw.status || "active";
  if (!athleteStatuses.includes(status as ManagementAthleteStatus)) {
    return { ok: false, message: "A situação de atleta informada não existe." };
  }

  const search = raw.q
    ? raw.q.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim()
    : null;
  if (raw.q && (!search || search.length < 2 || search.length > 80)) {
    return { ok: false, message: "A busca deve ter entre 2 e 80 caracteres." };
  }

  const positionCode = raw.position ? raw.position.trim().toUpperCase() : null;
  if (positionCode && !/^[A-Z_]{1,16}$/.test(positionCode)) {
    return { ok: false, message: "A posição informada não é válida." };
  }

  const cursor = raw.cursor ? decodeManagementAthleteCursor(raw.cursor) : null;
  if (raw.cursor && !cursor) {
    return { ok: false, message: "A página solicitada não é válida." };
  }

  return {
    ok: true,
    filters: {
      status: status as ManagementAthleteStatus,
      search,
      positionCode,
      cursor,
    },
  };
}

export function buildManagementAthleteListUrl(
  teamSlug: string,
  filters: Omit<ManagementAthleteFilters, "cursor">,
  cursor?: ManagementAthleteCursor | null,
) {
  const query = new URLSearchParams();
  if (filters.status !== "active") query.set("status", filters.status);
  if (filters.search) query.set("q", filters.search);
  if (filters.positionCode) query.set("position", filters.positionCode);
  if (cursor) query.set("cursor", encodeManagementAthleteCursor(cursor));
  const suffix = query.toString();
  return `/app/${teamSlug}/athletes${suffix ? `?${suffix}` : ""}`;
}

const unavailableCodes = new Set(["P0001", "42883", "PGRST202"]);

export async function getManagementAthletePage(
  teamId: string,
  sportFormat: "field" | "society" | "futsal",
  filters: ManagementAthleteFilters,
): Promise<
  | { mode: "enhanced"; page: ManagementAthletePage }
  | { mode: "unavailable" }
  | { mode: "error" }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_management_athletes", {
    requested_team_id: teamId,
    requested_status: filters.status,
    requested_search: filters.search ?? undefined,
    requested_position_code: filters.positionCode ?? undefined,
    requested_limit: 24,
    requested_cursor: (filters.cursor as Json | null) ?? undefined,
  });

  if (error) {
    if (unavailableCodes.has(error.code)) return { mode: "unavailable" };
    console.warn("[recognizable-roster] list_rpc_error", { code: error.code });
    return { mode: "error" };
  }

  const parsed = managementAthleteListSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("[recognizable-roster] invalid_response", {
      paths: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
    return { mode: "error" };
  }

  const uniquePaths = [
    ...new Set(
      parsed.data.items.flatMap((athlete) =>
        athlete.photo_path ? [athlete.photo_path] : [],
      ),
    ),
  ];
  const [positionsResult, signedResult] = await Promise.all([
    supabase
      .from("positions")
      .select("code, label")
      .eq("sport_format", sportFormat)
      .order("sort_order"),
    uniquePaths.length
      ? supabase.storage.from("athlete_avatars").createSignedUrls(uniquePaths, 900)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (positionsResult.error) {
    console.warn("[recognizable-roster] positions_query_error", {
      code: positionsResult.error.code,
    });
    return { mode: "error" };
  }

  if (signedResult.error) {
    console.warn("[recognizable-roster] media_sign_error");
  }

  const signedUrlByPath = new Map(
    (signedResult.data ?? []).flatMap((item) =>
      item.path && item.signedUrl
        ? [[item.path, item.signedUrl] as const]
        : [],
    ),
  );

  return {
    mode: "enhanced",
    page: {
      items: parsed.data.items.map(({ photo_path: photoPath, ...athlete }) => ({
        ...athlete,
        photo_url: photoPath ? signedUrlByPath.get(photoPath) ?? null : null,
      })),
      filteredCount: parsed.data.filtered_count,
      pendingCount: parsed.data.pending_count,
      nextCursor: parsed.data.next_cursor,
      positions: positionsResult.data ?? [],
    },
  };
}
