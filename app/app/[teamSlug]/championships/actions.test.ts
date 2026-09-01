import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isChampionshipsEnabled: vi.fn(),
  isProfessionalSchedulingEnabled: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/features/championships/server", () => ({
  isChampionshipsEnabled: mocks.isChampionshipsEnabled,
}));
vi.mock("@/lib/features/professional-scheduling/server", () => ({
  isProfessionalSchedulingEnabled: mocks.isProfessionalSchedulingEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  addChampionshipParticipant,
  advanceChampionshipGroups,
  createChampionship,
  decideChampionshipQualifier,
  generateChampionshipFixtures,
  generateLeagueFixtures,
  linkChampionshipFixture,
  publishChampionshipFormat,
  publishLeagueChampionship,
  releaseChampionshipFixture,
  resolveChampionshipFixture,
  setChampionshipPublicMode,
  withdrawChampionshipParticipant,
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
  form.set("format", "league");
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
    mocks.isProfessionalSchedulingEnabled.mockResolvedValue(false);
  });

  it("cria rascunho profissional já com as equipes selecionadas", async () => {
    mocks.isProfessionalSchedulingEnabled.mockResolvedValue(true);
    mocks.rpc.mockResolvedValue({
      data: { championship_id: ids.championship, replayed: false },
      error: null,
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const form = createForm();
    form.append("internalTeamIds", "e9600000-0000-4000-8000-000000000001");
    form.append("internalTeamIds", "e9600000-0000-4000-8000-000000000002");

    await expect(createChampionship({}, form)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_championship_draft_v2",
      expect.objectContaining({
        requested_internal_team_ids: [
          "e9600000-0000-4000-8000-000000000001",
          "e9600000-0000-4000-8000-000000000002",
        ],
      }),
    );
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

  it("cria grupos com configuração validada no servidor", async () => {
    mocks.rpc.mockResolvedValue({
      data: { championship_id: ids.championship, replayed: false },
      error: null,
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const form = createForm();
    form.set("format", "groups_knockout");
    form.set("groupCount", "2");
    form.set("qualifiersPerGroup", "1");

    await expect(createChampionship({}, form)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.rpc).toHaveBeenCalledWith("create_championship_draft", expect.objectContaining({
      requested_format: "groups_knockout",
      requested_group_count: 2,
      requested_qualifiers_per_group: 1,
    }));
  });

  it("adiciona adversário externo como snapshot estreito", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("seed", "2");
    form.set("groupNumber", "1");
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
      requested_group_number: 1,
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

  it("roteia geração e publicação dos formatos novos pelas RPCs estreitas", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("format", "knockout");
    await expect(generateChampionshipFixtures({}, form)).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenLastCalledWith("generate_championship_fixtures", {
      requested_championship_id: ids.championship,
      request_id: ids.request,
    });
    await expect(publishChampionshipFormat({}, form)).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenLastCalledWith("publish_championship_format", {
      requested_championship_id: ids.championship,
      request_id: ids.request,
    });
  });

  it("registra vaga empatada e avança grupos sem enviar a tabela", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const decision = commandForm();
    decision.set("groupNumber", "1");
    decision.set("qualifierPosition", "1");
    decision.set("participantId", "e9600000-0000-4000-8000-000000000001");
    decision.set("reason", "Desempate confirmado pela organização");
    await expect(decideChampionshipQualifier({}, decision)).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenLastCalledWith("decide_championship_qualifier", expect.objectContaining({
      requested_group_number: 1,
      requested_qualifier_position: 1,
      requested_reason: "Desempate confirmado pela organização",
    }));
    await expect(advanceChampionshipGroups({}, commandForm())).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenLastCalledWith("advance_championship_groups", {
      requested_championship_id: ids.championship,
      request_id: ids.request,
    });
  });

  it("envia decisão eliminatória explícita sem alterar o placar", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("fixtureId", ids.fixture);
    form.set("winnerId", "e9600000-0000-4000-8000-000000000001");
    form.set("resolution", "penalties");
    form.set("reason", "Vitória confirmada nos pênaltis");
    await expect(resolveChampionshipFixture({}, form)).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenLastCalledWith("resolve_championship_knockout_fixture", {
      requested_fixture_id: ids.fixture,
      request_id: ids.request,
      requested_winner_id: "e9600000-0000-4000-8000-000000000001",
      requested_resolution: "penalties",
      requested_reason: "Vitória confirmada nos pênaltis",
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

  it("libera apenas o vínculo futuro com motivo auditável", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("fixtureId", ids.fixture);
    form.set("reason", "Data alterada em acordo com as equipes");
    await expect(releaseChampionshipFixture({}, form)).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("novo agendamento"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("release_championship_fixture_match", {
      requested_fixture_id: ids.fixture,
      request_id: ids.request,
      requested_reason: "Data alterada em acordo com as equipes",
    });
  });

  it("retira participante por RPC e não envia alteração de resultados", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("participantId", "e9600000-0000-4000-8000-000000000001");
    form.set("reason", "Equipe desistiu da competição");
    await expect(withdrawChampionshipParticipant({}, form)).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("preservados"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("withdraw_championship_participant", {
      requested_participant_id: "e9600000-0000-4000-8000-000000000001",
      request_id: ids.request,
      requested_reason: "Equipe desistiu da competição",
    });
  });

  it("publica a projeção anônima por RPC e revalida o ID público", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = commandForm();
    form.set("publicId", "e9700000-0000-4000-8000-000000000001");
    form.set("mode", "public");
    await expect(setChampionshipPublicMode({}, form)).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("link"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("set_championship_public_mode", {
      requested_championship_id: ids.championship,
      request_id: ids.request,
      requested_mode: "public",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/c/e9700000-0000-4000-8000-000000000001",
    );
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
