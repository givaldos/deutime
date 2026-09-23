import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ManagementEventKind } from "@/lib/data/management-events";
import { z } from "zod";

const linkedOptionSchema = z.object({ id: z.guid(), name: z.string() });

const calendarItemSchema = z.object({
  id: z.guid(),
  title: z.string(),
  kind: z.enum(["weekly_match", "championship", "friendly", "tournament", "training", "other"]),
  sport_format: z.enum(["field", "society", "futsal"]),
  starts_at: z.string(),
  ends_at: z.string(),
  professional_schedule_state: z.enum(["scheduled", "pending_review"]),
  venue_name: z.string().nullable(),
  championships: z.array(linkedOptionSchema),
  internal_teams: z.array(linkedOptionSchema.extend({ color: z.string() })),
  pending_conflict_count: z.number().int().nonnegative(),
  highest_severity: z.enum(["warning", "hard"]).nullable(),
}).strict();

const rescheduleItemSchema = z.object({
  id: z.guid(),
  title: z.string(),
  kind: z.enum(["weekly_match", "championship", "friendly", "tournament", "training", "other"]),
  professional_schedule_state: z.enum(["date_tbd", "postponed"]),
  reason: z.string(),
}).strict();

const managementCalendarSchema = z.object({
  period: z.object({
    start: z.string(),
    end: z.string(),
    time_zone: z.string(),
  }),
  items: z.array(calendarItemSchema),
  truncated: z.boolean(),
  reschedule_items: z.array(rescheduleItemSchema),
  summary: z.object({
    scheduled_count: z.number().int().nonnegative(),
    reschedule_count: z.number().int().nonnegative(),
    conflict_count: z.number().int().nonnegative(),
  }),
}).strict();

export type ManagementCalendar = z.infer<typeof managementCalendarSchema>;
export type ManagementCalendarItem = z.infer<typeof calendarItemSchema>;

const unavailableCodes = new Set(["P0001", "42883", "PGRST202"]);

export async function getManagementCalendar({
  mode,
  teamId,
  start,
  end,
  search,
  kind,
  internalTeamId,
  championshipId,
}: {
  mode: "week" | "month";
  teamId: string;
  start: string;
  end: string;
  search: string | null;
  kind: ManagementEventKind | null;
  internalTeamId: string | null;
  championshipId: string | null;
}): Promise<
  | { mode: "calendar"; calendar: ManagementCalendar }
  | { mode: "unavailable" }
  | { mode: "error" }
> {
  const startedAt = Date.now();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_management_calendar", {
    requested_team_id: teamId,
    requested_start: start,
    requested_end: end,
    requested_search: search ?? undefined,
    requested_kind: kind ?? undefined,
    requested_internal_team_id: internalTeamId ?? undefined,
    requested_championship_id: championshipId ?? undefined,
  });

  if (error) {
    if (unavailableCodes.has(error.code)) {
      console.info("[calendar-workspace] calendar_read", {
        view: mode,
        duration_ms: Date.now() - startedAt,
        fallback: true,
        result: "unavailable",
      });
      return { mode: "unavailable" };
    }
    console.warn("[calendar-workspace] calendar_rpc_error", {
      view: mode,
      duration_ms: Date.now() - startedAt,
      fallback: true,
      code: error.code,
    });
    return { mode: "error" };
  }

  const parsed = managementCalendarSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("[calendar-workspace] calendar_invalid_response", {
      view: mode,
      duration_ms: Date.now() - startedAt,
      fallback: true,
      paths: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
    return { mode: "error" };
  }
  console.info("[calendar-workspace] calendar_read", {
    view: mode,
    duration_ms: Date.now() - startedAt,
    fallback: false,
    item_count: parsed.data.items.length,
    reschedule_count: parsed.data.reschedule_items.length,
    conflict_count: parsed.data.summary.conflict_count,
  });
  return { mode: "calendar", calendar: parsed.data };
}
