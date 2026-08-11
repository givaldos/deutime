import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isTeamFeatureEnabled: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: mocks.isTeamFeatureEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  linkEventLineupSquadToMatchSide,
  publishEventLineup,
  saveEventLineupDraft,
  withdrawEventLineupPublication,
} from "./lineup-actions";

const ids = {
  team: "d7200000-0000-4000-8000-000000000001",
  event: "d7300000-0000-4000-8000-000000000001",
  request: "d7500000-0000-4000-8000-000000000001",
  squadA: "d7600000-0000-4000-8000-000000000001",
  squadB: "d7600000-0000-4000-8000-000000000002",
  athlete: "d7400000-0000-4000-8000-000000000001",
  match: "d7700000-0000-4000-8000-000000000001",
  public: "e7310000-0000-4000-8000-000000000001",
};

function draftForm() {
  const form = new FormData();
  form.set("teamId", ids.team);
  form.set("teamSlug", "society-united");
  form.set("eventId", ids.event);
  form.set("requestId", ids.request);
  form.set("squads", JSON.stringify([
    { id: ids.squadA, name: "Azul", color: "#0D9488", sort_order: 1 },
    { id: ids.squadB, name: "Branco", color: "#2563EB", sort_order: 2 },
  ]));
  form.set("assignments", JSON.stringify([
    { athlete_id: ids.athlete, squad_id: ids.squadA, sort_order: 1, position_code: null, slot_kind: "starter" },
  ]));
  form.set("exclusions", "[]");
  return form;
}

describe("ações da divisão manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "staff" });
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);
  });

  it("falha fechado antes do banco quando a flag está desligada", async () => {
    mocks.isTeamFeatureEnabled.mockResolvedValue(false);
    await expect(saveEventLineupDraft({}, draftForm())).resolves.toMatchObject({
      outcome: "error",
      message: expect.stringContaining("ainda não está disponível"),
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("valida e delega o estado completo para a RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: { assigned_count: 1, excluded_count: 0, replayed: false },
      error: null,
    });
    await expect(saveEventLineupDraft({}, draftForm())).resolves.toMatchObject({
      outcome: "success",
      message: "Rascunho salvo: 1 distribuídos e 0 fora.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("save_event_lineup_draft", {
      requested_event_id: ids.event,
      request_id: ids.request,
      requested_squads: expect.arrayContaining([expect.objectContaining({ id: ids.squadA })]),
      requested_assignments: expect.arrayContaining([expect.objectContaining({ athlete_id: ids.athlete })]),
      requested_exclusions: [],
    });
  });

  it("traduz mudança concorrente sem expor detalhe interno", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23514", message: "nome privado" } });
    await expect(saveEventLineupDraft({}, draftForm())).resolves.toEqual({
      attempt: 1,
      outcome: "error",
      message: "A lista mudou. Atualize a página e revise os confirmados.",
    });
  });

  it("vincula somente IDs estreitos da partida e do time salvo", async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    const form = new FormData();
    form.set("teamId", ids.team);
    form.set("teamSlug", "society-united");
    form.set("eventId", ids.event);
    form.set("matchId", ids.match);
    form.set("sideIndex", "1");
    form.set("squadId", ids.squadA);
    form.set("requestId", ids.request);
    await expect(linkEventLineupSquadToMatchSide({}, form)).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenCalledWith("link_event_lineup_squad_to_match_side", {
      requested_match_id: ids.match,
      requested_side_index: 1,
      requested_squad_id: ids.squadA,
      request_id: ids.request,
    });
  });

  it("publica e invalida somente as superfícies canônicas do evento", async () => {
    mocks.rpc.mockResolvedValue({
      data: { squad_count: 2, assigned_count: 4, replayed: false },
      error: null,
    });
    const form = new FormData();
    form.set("teamId", ids.team);
    form.set("teamSlug", "society-united");
    form.set("eventId", ids.event);
    form.set("publicId", ids.public);
    form.set("requestId", ids.request);
    await expect(publishEventLineup({}, form)).resolves.toMatchObject({
      outcome: "success",
      message: "Revisão publicada com 2 times e 4 atletas.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("publish_event_lineup", {
      requested_event_id: ids.event,
      request_id: ids.request,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/e/${ids.public}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/e/${ids.public}/convite.png`);
  });

  it("retira a publicação sem apagar o rascunho", async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: false }, error: null });
    const form = new FormData();
    for (const [name, value] of Object.entries({
      teamId: ids.team,
      teamSlug: "society-united",
      eventId: ids.event,
      publicId: ids.public,
      requestId: ids.request,
    })) form.set(name, value);
    await expect(withdrawEventLineupPublication({}, form)).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("rascunho continua salvo"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("withdraw_event_lineup_publication", {
      requested_event_id: ids.event,
      request_id: ids.request,
    });
  });
});
