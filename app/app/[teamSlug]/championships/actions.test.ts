import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isChampionshipsEnabled: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/features/championships/server", () => ({
  isChampionshipsEnabled: mocks.isChampionshipsEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  addChampionshipParticipant,
  createChampionship,
  generateLeagueFixtures,
  linkChampionshipFixture,
  publishLeagueChampionship,
} from "./actions";

const ids = {
  team: "e9100000-0000-4000-8000-000000000001",
  championship: "e9200000-0000-4000-8000-000000000001",
  request: "e9300000-0000-4000-8000-000000000001",
  fixture: "e9400000-0000-4000-8000-000000000001",
  match: "e9500000-0000-4000-8000-000000000001",
};

function createForm() {
  const form = new FormData();
  form.set("teamId", ids.team);
  form.set("teamSlug", "liga-a");
  form.set("requestId", ids.request);
  form.set("name", "Liga da Vila");
  form.set("winPoints", "3");
  form.set("drawPoints", "1");
  form.set("lossPoints", "0");
  for (const key of ["wins", "goal_difference", "goals_for", "head_to_head"]) {
    form.append("tiebreakOrder", key);
  }
  return form;
}

function commandForm() {
  const form = new FormData();
  form.set("teamId", ids.team);
  form.set("teamSlug", "liga-a");
  form.set("championshipId", ids.championship);
  form.set("requestId", ids.request);
  return form;
}

describe("ações do campeonato de pontos corridos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "staff" });
    mocks.isChampionshipsEnabled.mockResolvedValue(true);
  });

  it("falha fechado antes do banco quando a flag está desligada", async () => {
    mocks.isChampionshipsEnabled.mockResolvedValue(false);
    await expect(createChampionship({}, createForm())).resolves.toMatchObject({
      outcome: "error",
      message: expect.stringContaining("ainda não estão disponíveis"),
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("cria somente pontos corridos com regulamento validado", async () => {
    mocks.rpc.mockResolvedValue({
      data: { championship_id: ids.championship, replayed: false },
      error: null,
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(createChampionship({}, createForm())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.rpc).toHaveBeenCalledWith("create_championship_draft", {
      requested_team_id: ids.team,
      request_id: ids.request,
      requested_name: "Liga da Vila",
      requested_format: "league",
      requested_win_points: 3,
      requested_draw_points: 1,
      requested_loss_points: 0,
      requested_tiebreak_order: ["wins", "goal_difference", "goals_for", "head_to_head"],
      requested_group_count: undefined,
      requested_qualifiers_per_group: undefined,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/liga-a/championships");
  });

  it("adiciona adversário externo como snapshot estreito", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("seed", "2");
    form.set("kind", "external");
    form.set("externalName", "Visitante");
    form.set("externalColor", "#2563EB");
    form.set("externalBadgeKey", "shield");

    await expect(addChampionshipParticipant({}, form)).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("adicionado"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("add_championship_participant", {
      requested_championship_id: ids.championship,
      request_id: ids.request,
      requested_seed: 2,
      requested_group_number: null,
      requested_internal_team_id: null,
      requested_external_name: "Visitante",
      requested_external_color: "#2563EB",
      requested_external_badge_key: "shield",
    });
  });

  it("delega geração idempotente sem enviar a grade pelo navegador", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    await expect(generateLeagueFixtures({}, commandForm())).resolves.toMatchObject({
      outcome: "success",
      message: "Confrontos gerados para revisão.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("generate_league_fixtures", {
      requested_championship_id: ids.championship,
      request_id: ids.request,
    });
  });

  it("publica somente pelo comando transacional", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: true }, error: null });
    await expect(publishLeagueChampionship({}, commandForm())).resolves.toMatchObject({
      outcome: "success",
      message: "O campeonato já estava publicado.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("publish_league_championship", {
      requested_championship_id: ids.championship,
      request_id: ids.request,
    });
  });

  it("vincula somente IDs e deixa lados e tenant para a RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("fixtureId", ids.fixture);
    form.set("matchId", ids.match);
    await expect(linkChampionshipFixture({}, form)).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("placar da súmula"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("link_championship_fixture_match", {
      requested_fixture_id: ids.fixture,
      request_id: ids.request,
      requested_match_id: ids.match,
    });
  });

  it("traduz negação sem expor detalhes internos do banco", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "private" } });
    await expect(generateLeagueFixtures({}, commandForm())).resolves.toEqual({
      attempt: 1,
      outcome: "error",
      message: "Você não tem permissão para fazer isso.",
    });
  });
});
