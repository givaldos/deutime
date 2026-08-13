import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import {
  getPublicChampionship,
  getPublicChampionshipWithFallback,
} from "./public-championship";

const publicId = "ca000000-0000-4000-8000-000000000001";
const validProjection = {
  championship: {
    public_id: publicId,
    name: "Liga Pública",
    format: "league",
    status: "published",
    win_points: 3,
    draw_points: 1,
    loss_points: 0,
    tiebreak_order: ["wins", "goal_difference"],
    group_count: null,
    qualifiers_per_group: null,
    published_at: "2026-08-13T12:00:00+00:00",
  },
  participants: [
    { seed: 1, name: "Verde", color: "#059669", badge_key: "shield", group_number: null, status: "active" },
    { seed: 2, name: "Azul", color: "#2563EB", badge_key: "stripes", group_number: null, status: "active" },
  ],
  standings: [],
  fixtures: [{
    stage: "league",
    status: "scheduled",
    group_number: null,
    round_number: 1,
    ordinal: 1,
    side_one_kind: "participant",
    side_two_kind: "participant",
    side_one: { seed: 1, name: "Verde", color: "#059669", badge_key: "shield" },
    side_two: { seed: 2, name: "Azul", color: "#2563EB", badge_key: "stripes" },
    winner_seed: null,
    resolution: null,
    score_one: null,
    score_two: null,
    event_public_id: null,
  }],
};

describe("getPublicChampionship", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejeita identificador inválido antes do banco", async () => {
    await expect(getPublicChampionship("../segredo")).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("aceita somente a projeção JSON estrita e mínima", async () => {
    mocks.rpc.mockResolvedValue({ data: validProjection, error: null });
    await expect(getPublicChampionship(publicId)).resolves.toEqual(validProjection);
    expect(mocks.rpc).toHaveBeenCalledWith("get_public_championship", {
      requested_public_id: publicId,
    });
  });

  it("falha fechado se a projeção trouxer um ID interno", async () => {
    mocks.rpc.mockResolvedValue({
      data: { ...validProjection, championship_id: "interno" },
      error: null,
    });
    await expect(getPublicChampionship(publicId)).resolves.toBeNull();
  });

  it("tolera schema N-1 e indisponibilidade sem ampliar a página", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST202", message: "missing" },
    });
    await expect(getPublicChampionship(publicId)).resolves.toBeNull();

    mocks.rpc.mockRejectedValueOnce(new Error("offline"));
    await expect(getPublicChampionshipWithFallback(
      "ca000000-0000-4000-8000-000000000002",
    )).resolves.toBeNull();
  });
});
