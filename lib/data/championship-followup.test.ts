import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return { rpc, query, createClient: vi.fn(async () => ({ rpc, from: () => query })) };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import {
  decodeChampionshipFollowupCursor,
  encodeChampionshipFollowupCursor,
  getChampionshipFollowupFixturePage,
  getChampionshipFollowupParticipants,
  getChampionshipFollowupStandings,
  getChampionshipFollowupSummary,
  type ChampionshipFollowupCursor,
  type ChampionshipFollowupFilters,
} from "./championship-followup";

const teamId = "11111111-1111-4111-8111-111111111111";
const championshipId = "22222222-2222-4222-8222-222222222222";
const fixtureId = "33333333-3333-4333-8333-333333333333";
const matchId = "44444444-4444-4444-8444-444444444444";
const eventId = "55555555-5555-4555-8555-555555555555";
const cursor: ChampionshipFollowupCursor = {
  stage_rank: 1,
  group_number: 0,
  round_number: 1,
  ordinal: 24,
  id: fixtureId,
};
const filters: ChampionshipFollowupFilters = {
  stage: "league",
  groupNumber: null,
  roundNumber: 1,
  view: "upcoming",
  cursor,
};
const validSummary = {
  championship: {
    id: championshipId,
    name: "Liga do bairro",
    format: "league",
    status: "active",
    status_label: "Em andamento",
    public_mode: "private",
  },
  phase: {
    kind: "league",
    label: "Rodada 1",
    stage: "league",
    group_number: null,
    round_number: 1,
  },
  progress: {
    completed_matches: 1,
    planned_matches: 496,
    scheduled_matches: 3,
    unscheduled_matches: 492,
  },
  next_games: [{
    fixture_id: fixtureId,
    match_id: matchId,
    event_id: eventId,
    event_title: "Rodada 1",
    starts_at: "2026-09-20T18:00:00+00:00",
    stage: "league",
    group_number: null,
    round_number: 1,
    side_a: "Azul",
    side_b: "Branco",
  }],
  next_action: { kind: "schedule_matches", label: "Agendar jogos", allowed: true },
  active_participants: 32,
  regulation_version_number: 1,
};
const validPage = {
  items: [{
    id: fixtureId,
    stage: "league",
    group_number: null,
    round_number: 1,
    ordinal: 1,
    status: "scheduled",
    situation: "upcoming",
    match_id: matchId,
    event_id: eventId,
    event_title: "Rodada 1",
    starts_at: "2026-09-20T18:00:00+00:00",
    side_a: "Azul",
    side_b: "Branco",
  }],
  filtered_count: 3,
  next_cursor: cursor,
  effective_filters: { stage: "league", round_number: 1, view: "upcoming" },
};

describe("championship follow-up data boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("codifica e rejeita cursor adulterado", () => {
    expect(decodeChampionshipFollowupCursor(
      encodeChampionshipFollowupCursor(cursor),
    )).toEqual(cursor);
    expect(decodeChampionshipFollowupCursor("inválido")).toBeNull();
    expect(decodeChampionshipFollowupCursor(Buffer.from(JSON.stringify({
      ...cursor,
      extra: true,
    })).toString("base64url"))).toBeNull();
  });

  it("carrega e valida o resumo privado", async () => {
    mocks.rpc.mockResolvedValue({ data: validSummary, error: null });
    await expect(getChampionshipFollowupSummary(teamId, championshipId)).resolves
      .toEqual({ mode: "enhanced", data: validSummary });
    expect(mocks.rpc).toHaveBeenCalledWith("get_championship_followup_summary", {
      requested_team_id: teamId,
      requested_championship_id: championshipId,
    });
  });

  it("delega filtros e cursor para a página de confrontos", async () => {
    mocks.rpc.mockResolvedValue({ data: validPage, error: null });
    await expect(getChampionshipFollowupFixturePage(
      teamId,
      championshipId,
      filters,
    )).resolves.toEqual({ mode: "enhanced", data: validPage });
    expect(mocks.rpc).toHaveBeenCalledWith("list_championship_followup_fixtures", {
      requested_team_id: teamId,
      requested_championship_id: championshipId,
      requested_stage: "league",
      requested_group_number: undefined,
      requested_round_number: 1,
      requested_view: "upcoming",
      requested_limit: 24,
      requested_cursor: cursor,
    });
  });

  it("valida classificação e snapshots de participantes", async () => {
    const standing = { rank_position: 1, participant_id: fixtureId, participant_name: "Azul", participant_color: "#0000ff", participant_badge_key: "shield", played: 1, wins: 1, draws: 0, losses: 0, goals_for: 2, goals_against: 0, goal_difference: 2, points: 3, head_to_head_points: 0 };
    mocks.rpc.mockResolvedValue({ data: [standing], error: null });
    await expect(getChampionshipFollowupStandings(championshipId, "league")).resolves.toEqual({ mode: "enhanced", data: [standing] });
    mocks.query.limit.mockResolvedValue({ data: [{ id: fixtureId, snapshot_name: "Azul", snapshot_color: "#0000ff", snapshot_badge_key: "shield", seed: 1, group_number: null, status: "active" }], error: null });
    await expect(getChampionshipFollowupParticipants(teamId, championshipId)).resolves.toMatchObject({ mode: "enhanced", data: [{ snapshot_name: "Azul" }] });
  });

  it.each(["P0001", "42883", "PGRST202"])(
    "mantém o fallback quando o contrato está indisponível (%s)",
    async (code) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "indisponível" } });
      await expect(getChampionshipFollowupSummary(teamId, championshipId)).resolves
        .toEqual({ mode: "unavailable" });
      await expect(getChampionshipFollowupFixturePage(
        teamId,
        championshipId,
        filters,
      )).resolves.toEqual({ mode: "unavailable" });
    },
  );

  it("diferencia falha inesperada e resposta inválida", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "negado" } });
    await expect(getChampionshipFollowupSummary(teamId, championshipId)).resolves
      .toEqual({ mode: "error" });
    mocks.rpc.mockResolvedValueOnce({ data: { items: [] }, error: null });
    await expect(getChampionshipFollowupFixturePage(
      teamId,
      championshipId,
      filters,
    )).resolves.toEqual({ mode: "error" });
  });
});
