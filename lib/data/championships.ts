import "server-only";

import type { Database } from "@/lib/database.types";
import { isChampionshipsEnabled } from "@/lib/features/championships/server";
import { createClient } from "@/lib/supabase/server";

type Championship = Database["public"]["Tables"]["championships"]["Row"];
type Participant = Database["public"]["Tables"]["championship_participants"]["Row"];
type Fixture = Database["public"]["Tables"]["championship_fixtures"]["Row"];
type FixtureSlot = Database["public"]["Tables"]["championship_fixture_slots"]["Row"];
type Standing = Database["public"]["Functions"]["get_championship_standings"]["Returns"][number];
type GroupStanding = Database["public"]["Functions"]["get_championship_group_standings"]["Returns"][number];
type QualificationDecision = Database["public"]["Tables"]["championship_qualification_decisions"]["Row"];

export type ChampionshipSummary = Pick<
  Championship,
  | "id"
  | "name"
  | "format"
  | "status"
  | "public_mode"
  | "updated_at"
  | "published_at"
>;

export type ChampionshipCandidateMatch = {
  id: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;
  ordinal: number;
  sideLabels: [string, string];
};

export type ChampionshipMatchMeta = {
  id: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;
  ordinal: number;
  status: string;
};

export type ChampionshipWorkspace = {
  championship: Championship;
  participants: Participant[];
  fixtures: Fixture[];
  slots: FixtureSlot[];
  standings: Standing[];
  groupStandings: GroupStanding[];
  qualificationDecisions: QualificationDecision[];
  internalSquads: {
    id: string;
    name: string;
    color: string;
    badgeKey: Database["public"]["Enums"]["internal_squad_badge_key"];
  }[];
  candidateMatches: ChampionshipCandidateMatch[];
  matchById: Record<string, ChampionshipMatchMeta>;
};

export async function getChampionships(
  teamId: string,
): Promise<ChampionshipSummary[] | null> {
  if (!(await isChampionshipsEnabled(teamId))) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("championships")
    .select("id, name, format, status, public_mode, updated_at, published_at")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os campeonatos.");
  return data ?? [];
}

export async function getChampionshipWorkspace(
  teamId: string,
  championshipId: string,
): Promise<ChampionshipWorkspace | null> {
  if (!(await isChampionshipsEnabled(teamId))) return null;
  const supabase = await createClient();
  const { data: championship, error: championshipError } = await supabase
    .from("championships")
    .select("*")
    .eq("id", championshipId)
    .eq("team_id", teamId)
    .maybeSingle();
  if (championshipError) {
    throw new Error("Não foi possível carregar o campeonato.");
  }
  if (!championship) return null;

  const [participantsResult, fixturesResult, slotsResult, decisionsResult, squadsResult] =
    await Promise.all([
      supabase
        .from("championship_participants")
        .select("*")
        .eq("championship_id", championshipId)
        .eq("team_id", teamId)
        .order("seed"),
      supabase
        .from("championship_fixtures")
        .select("*")
        .eq("championship_id", championshipId)
        .eq("team_id", teamId)
        .order("round_number")
        .order("ordinal"),
      supabase
        .from("championship_fixture_slots")
        .select("*")
        .eq("championship_id", championshipId)
        .eq("team_id", teamId),
      supabase
        .from("championship_qualification_decisions")
        .select("*")
        .eq("championship_id", championshipId)
        .eq("team_id", teamId)
        .order("group_number")
        .order("qualifier_position"),
      supabase
        .from("team_squad_presets")
        .select("id, name, color, badge_key")
        .eq("team_id", teamId)
        .order("sort_order"),
    ]);

  if (
    participantsResult.error ||
    fixturesResult.error ||
    slotsResult.error ||
    decisionsResult.error ||
    squadsResult.error
  ) {
    throw new Error("Não foi possível montar a área do campeonato.");
  }

  let standings: Standing[] = [];
  let groupStandings: GroupStanding[] = [];
  if (championship.format === "league") {
    const result = await supabase.rpc("get_championship_standings", {
      requested_championship_id: championshipId,
    });
    if (result.error) throw new Error("Não foi possível montar a classificação.");
    standings = result.data ?? [];
  } else if (championship.format === "groups_knockout") {
    const result = await supabase.rpc("get_championship_group_standings", {
      requested_championship_id: championshipId,
    });
    if (result.error) throw new Error("Não foi possível montar os grupos.");
    groupStandings = result.data ?? [];
  }

  const fixtures = fixturesResult.data ?? [];
  const linkedMatchIds = fixtures
    .map((fixture) => fixture.match_id)
    .filter((id): id is string => Boolean(id));
  const { data: scheduledMatches, error: scheduledError } = await supabase
    .from("event_matches")
    .select("id, event_id, ordinal, status")
    .eq("team_id", teamId)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(80);
  if (scheduledError) throw new Error("Não foi possível carregar as partidas.");

  const scheduledIds = (scheduledMatches ?? []).map((match) => match.id);
  const [factsResult, participationsResult] = scheduledIds.length
    ? await Promise.all([
        supabase.from("match_events").select("match_id").in("match_id", scheduledIds),
        supabase
          .from("match_participations")
          .select("match_id")
          .in("match_id", scheduledIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (factsResult.error || participationsResult.error) {
    throw new Error("Não foi possível validar as partidas disponíveis.");
  }

  const unavailableIds = new Set([
    ...linkedMatchIds,
    ...(factsResult.data ?? []).map((item) => item.match_id),
    ...(participationsResult.data ?? []).map((item) => item.match_id),
  ]);
  const eligibleMatches = (scheduledMatches ?? []).filter(
    (match) => !unavailableIds.has(match.id),
  );
  const relevantMatchIds = Array.from(new Set([
    ...linkedMatchIds,
    ...eligibleMatches.map((match) => match.id),
  ]));

  const linkedOnlyIds = linkedMatchIds.filter(
    (id) => !(scheduledMatches ?? []).some((match) => match.id === id),
  );
  const { data: linkedOnlyMatches, error: linkedError } = linkedOnlyIds.length
    ? await supabase
        .from("event_matches")
        .select("id, event_id, ordinal, status")
        .eq("team_id", teamId)
        .in("id", linkedOnlyIds)
    : { data: [], error: null };
  if (linkedError) throw new Error("Não foi possível carregar os vínculos.");

  const relevantMatches = [
    ...(scheduledMatches ?? []).filter((match) => relevantMatchIds.includes(match.id)),
    ...(linkedOnlyMatches ?? []),
  ];
  const eventIds = Array.from(new Set(relevantMatches.map((match) => match.event_id)));
  const [eventsResult, sidesResult] = await Promise.all([
    eventIds.length
      ? supabase.from("events").select("id, title, starts_at").in("id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    relevantMatchIds.length
      ? supabase
          .from("match_sides")
          .select("match_id, side_index, label")
          .in("match_id", relevantMatchIds)
          .order("side_index")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (eventsResult.error || sidesResult.error) {
    throw new Error("Não foi possível apresentar as partidas.");
  }

  const eventById = new Map((eventsResult.data ?? []).map((event) => [event.id, event]));
  const sidesByMatch = new Map<string, string[]>();
  for (const side of sidesResult.data ?? []) {
    const labels = sidesByMatch.get(side.match_id) ?? [];
    labels[side.side_index - 1] = side.label;
    sidesByMatch.set(side.match_id, labels);
  }
  const matchById: Record<string, ChampionshipMatchMeta> = {};
  for (const match of relevantMatches) {
    const event = eventById.get(match.event_id);
    if (!event) continue;
    matchById[match.id] = {
      id: match.id,
      eventId: match.event_id,
      eventTitle: event.title,
      startsAt: event.starts_at,
      ordinal: match.ordinal,
      status: match.status,
    };
  }

  return {
    championship,
    participants: participantsResult.data ?? [],
    fixtures,
    slots: slotsResult.data ?? [],
    standings,
    groupStandings,
    qualificationDecisions: decisionsResult.data ?? [],
    internalSquads: (squadsResult.data ?? []).map((squad) => ({
      id: squad.id,
      name: squad.name,
      color: squad.color,
      badgeKey: squad.badge_key,
    })),
    candidateMatches: eligibleMatches.flatMap((match) => {
      const event = eventById.get(match.event_id);
      if (!event) return [];
      const labels = sidesByMatch.get(match.id) ?? [];
      return [{
        id: match.id,
        eventId: match.event_id,
        eventTitle: event.title,
        startsAt: event.starts_at,
        ordinal: match.ordinal,
        sideLabels: [labels[0] ?? "Time A", labels[1] ?? "Time B"] as [string, string],
      }];
    }),
    matchById,
  };
}
