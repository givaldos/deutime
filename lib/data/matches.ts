import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isEventMatchesEnabled } from "@/lib/features/match/server";

export type MatchView = {
  id: string;
  ordinal: number;
  status: string;
  public_mode: string;
  sides: { id: string; side_index: number; label: string }[];
  participations: { athlete_id: string; side_id: string }[];
  events: { id: string; kind: string; side_id: string | null; athlete_id: string | null; minute: number | null; created_at: string }[];
};

export async function getEventMatches(teamId: string, eventId: string): Promise<MatchView[] | null> {
  if (!(await isEventMatchesEnabled(teamId))) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();
  const { data: matches } = await supabase.from("event_matches").select("id, ordinal, status, public_mode").eq("event_id", eventId).eq("team_id", teamId).order("ordinal");
  if (!matches || (matches as unknown as MatchView[]).length === 0) return [];
  const ids = (matches as unknown as MatchView[]).map((m) => m.id);
  const { data: sides } = await supabase.from("match_sides").select("id, match_id, side_index, label").in("match_id", ids).order("side_index");
  const { data: parts } = await supabase.from("match_participations").select("match_id, athlete_id, side_id").in("match_id", ids);
  const { data: events } = await supabase.from("match_events").select("id, match_id, kind, side_id, athlete_id, minute, created_at").in("match_id", ids).order("created_at");
  const sideByMatch = new Map<string, { id: string; side_index: number; label: string }[]>();
  for (const s of (sides as unknown as { id: string; match_id: string; side_index: number; label: string }[] | null) ?? []) {
    const arr = sideByMatch.get(s.match_id) ?? [];
    arr.push({ id: s.id, side_index: s.side_index, label: s.label });
    sideByMatch.set(s.match_id, arr);
  }
  const partByMatch = new Map<string, { athlete_id: string; side_id: string }[]>();
  for (const p of (parts as unknown as { match_id: string; athlete_id: string; side_id: string }[] | null) ?? []) {
    const arr = partByMatch.get(p.match_id) ?? [];
    arr.push({ athlete_id: p.athlete_id, side_id: p.side_id });
    partByMatch.set(p.match_id, arr);
  }
  const eventByMatch = new Map<string, MatchView["events"]>();
  for (const e of (events as unknown as { id: string; match_id: string; kind: string; side_id: string | null; athlete_id: string | null; minute: number | null; created_at: string }[] | null) ?? []) {
    const arr = eventByMatch.get(e.match_id) ?? [];
    arr.push({ id: e.id, kind: e.kind, side_id: e.side_id, athlete_id: e.athlete_id, minute: e.minute, created_at: e.created_at });
    eventByMatch.set(e.match_id, arr);
  }
  return (matches as unknown as { id: string; ordinal: number; status: string; public_mode: string }[]).map((m) => ({
    id: m.id, ordinal: m.ordinal, status: m.status, public_mode: m.public_mode,
    sides: sideByMatch.get(m.id) ?? [],
    participations: partByMatch.get(m.id) ?? [],
    events: eventByMatch.get(m.id) ?? [],
  }));
}
