import "server-only";

import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const championshipFormats = ["league", "groups_knockout", "knockout"] as const;
const championshipStatuses = [
  "draft",
  "published",
  "active",
  "completed",
  "archived",
] as const;
const fixtureStages = ["league", "group", "knockout"] as const;

const cursorSchema = z.object({
  stage_rank: z.number().int().min(1).max(3),
  group_number: z.number().int().min(0).max(8),
  round_number: z.number().int().min(1).max(32),
  ordinal: z.number().int().min(1).max(512),
  id: z.uuid(),
}).strict();

const nextGameSchema = z.object({
  fixture_id: z.uuid(),
  match_id: z.uuid(),
  event_id: z.uuid(),
  event_title: z.string(),
  starts_at: z.string(),
  stage: z.enum(fixtureStages),
  group_number: z.number().int().min(1).max(8).nullable(),
  round_number: z.number().int().min(1).max(32),
  side_a: z.string(),
  side_b: z.string(),
});

const summarySchema = z.object({
  championship: z.object({
    id: z.uuid(),
    name: z.string(),
    format: z.enum(championshipFormats),
    status: z.enum(championshipStatuses),
    status_label: z.string(),
    public_mode: z.enum(["private", "public"]),
  }),
  phase: z.object({
    kind: z.enum([
      "configuration",
      "league",
      "group",
      "qualification",
      "knockout",
      "completed",
    ]),
    label: z.string(),
    stage: z.enum(fixtureStages).nullable(),
    group_number: z.number().int().min(1).max(8).nullable(),
    round_number: z.number().int().min(1).max(32).nullable(),
  }),
  progress: z.object({
    completed_matches: z.number().int().nonnegative(),
    planned_matches: z.number().int().nonnegative(),
    scheduled_matches: z.number().int().nonnegative(),
    unscheduled_matches: z.number().int().nonnegative(),
  }),
  next_games: z.array(nextGameSchema).max(3),
  next_action: z.object({
    kind: z.enum([
      "continue_setup",
      "resolve_qualification",
      "build_knockout",
      "schedule_matches",
      "view_next_match",
      "completed",
    ]),
    label: z.string(),
    allowed: z.boolean(),
  }),
  active_participants: z.number().int().nonnegative(),
  regulation_version_number: z.number().int().positive().nullable(),
});

const fixtureSchema = z.object({
  id: z.uuid(),
  stage: z.enum(fixtureStages),
  group_number: z.number().int().min(1).max(8).nullable(),
  round_number: z.number().int().min(1).max(32),
  ordinal: z.number().int().min(1).max(512),
  status: z.enum(["draft", "scheduled", "finalized", "void"]),
  situation: z.enum(["upcoming", "completed", "unscheduled", "void"]),
  match_id: z.uuid().nullable(),
  event_id: z.uuid().nullable(),
  event_title: z.string().nullable(),
  starts_at: z.string().nullable(),
  side_a: z.string(),
  side_b: z.string(),
});

const pageSchema = z.object({
  items: z.array(fixtureSchema),
  filtered_count: z.number().int().nonnegative(),
  next_cursor: cursorSchema.nullable(),
  effective_filters: z.record(z.string(), z.unknown()),
});

export type ChampionshipFollowupSummary = z.infer<typeof summarySchema>;
export type ChampionshipFollowupFixturePage = z.infer<typeof pageSchema>;
export type ChampionshipFollowupCursor = z.infer<typeof cursorSchema>;
export type ChampionshipFollowupStage = (typeof fixtureStages)[number];
export type ChampionshipFollowupView =
  | "upcoming"
  | "completed"
  | "unscheduled"
  | "all";

export type ChampionshipFollowupFilters = {
  stage: ChampionshipFollowupStage | null;
  groupNumber: number | null;
  roundNumber: number | null;
  view: ChampionshipFollowupView;
  cursor: ChampionshipFollowupCursor | null;
};

type FollowupResult<T> =
  | { mode: "enhanced"; data: T }
  | { mode: "unavailable" }
  | { mode: "error" };

const unavailableCodes = new Set(["P0001", "42883", "PGRST202"]);

function classifyRpcError(code: string | undefined): "unavailable" | "error" {
  return code && unavailableCodes.has(code) ? "unavailable" : "error";
}

export function encodeChampionshipFollowupCursor(cursor: ChampionshipFollowupCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeChampionshipFollowupCursor(value: string) {
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
}

export async function getChampionshipFollowupSummary(
  teamId: string,
  championshipId: string,
): Promise<FollowupResult<ChampionshipFollowupSummary>> {
  const startedAt = performance.now();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_championship_followup_summary", {
    requested_team_id: teamId,
    requested_championship_id: championshipId,
  });

  if (error) {
    const mode = classifyRpcError(error.code);
    if (mode === "error") {
      console.warn("[championship-followup] summary_rpc_error", {
        code: error.code,
        latency_ms: Math.round(performance.now() - startedAt),
      });
    }
    return { mode };
  }

  const parsed = summarySchema.safeParse(data);
  if (!parsed.success) {
    console.warn("[championship-followup] summary_invalid_response", {
      paths: parsed.error.issues.map((issue) => issue.path.join(".")),
      latency_ms: Math.round(performance.now() - startedAt),
    });
    return { mode: "error" };
  }
  console.info("[championship-followup] section_view", {
    section: "summary",
    format: parsed.data.championship.format,
    status: parsed.data.championship.status,
    result: "success",
    latency_ms: Math.round(performance.now() - startedAt),
  });
  return { mode: "enhanced", data: parsed.data };
}

export async function getChampionshipFollowupFixturePage(
  teamId: string,
  championshipId: string,
  filters: ChampionshipFollowupFilters,
): Promise<FollowupResult<ChampionshipFollowupFixturePage>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_championship_followup_fixtures", {
    requested_team_id: teamId,
    requested_championship_id: championshipId,
    requested_stage: filters.stage ?? undefined,
    requested_group_number: filters.groupNumber ?? undefined,
    requested_round_number: filters.roundNumber ?? undefined,
    requested_view: filters.view,
    requested_limit: 24,
    requested_cursor: (filters.cursor as Json | null) ?? undefined,
  });

  if (error) {
    const mode = classifyRpcError(error.code);
    if (mode === "error") {
      console.warn("[championship-followup] fixtures_rpc_error", { code: error.code });
    }
    return { mode };
  }

  const parsed = pageSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("[championship-followup] fixtures_invalid_response", {
      paths: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
    return { mode: "error" };
  }
  return { mode: "enhanced", data: parsed.data };
}
