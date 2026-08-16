import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  loadMyRecognitions,
  loadRecognitionAvailability,
} from "./recognition";

const recognition = {
  catalog_version: "recognition-v1",
  kind: "goal_recorded",
  team_id: "b0200000-0000-4000-8000-000000000001",
  team_name: "Society United",
  source_id: "b0700000-0000-4000-8000-000000000001",
  match_id: "b0500000-0000-4000-8000-000000000001",
  event_id: "b0400000-0000-4000-8000-000000000001",
  event_title: "Jogo de domingo",
  match_ordinal: 1,
  recognized_at: "2026-08-16T18:00:00.000-03:00",
};

describe("recognition data", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  it("libera a visão somente para vínculo ativo com a flag ligada", async () => {
    mocks.rpc.mockImplementation((name: string, args?: { requested_team_id?: string }) => {
      if (name === "list_my_player_team_links") {
        return Promise.resolve({
          data: [
            { athlete_status: "active", team_id: "b0200000-0000-4000-8000-000000000001" },
            { athlete_status: "inactive", team_id: "b0200000-0000-4000-8000-000000000002" },
          ],
          error: null,
        });
      }
      return Promise.resolve({
        data: args?.requested_team_id === "b0200000-0000-4000-8000-000000000001",
        error: null,
      });
    });

    await expect(loadRecognitionAvailability()).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("falha fechado quando não há flag, vínculo ou schema disponível", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ athlete_status: "active", team_id: "b0200000-0000-4000-8000-000000000001" }],
      error: null,
    });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "22P02" } });
    await expect(loadRecognitionAvailability()).resolves.toBe(false);

    mocks.rpc.mockRejectedValueOnce(new Error("schema indisponível"));
    await expect(loadRecognitionAvailability()).resolves.toBe(false);
  });

  it("aceita somente a projeção tipada recognition-v1", async () => {
    mocks.rpc.mockResolvedValue({ data: [recognition], error: null });

    await expect(loadMyRecognitions()).resolves.toEqual([recognition]);
  });

  it("não entrega dados quando a RPC falha ou viola o catálogo", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    await expect(loadMyRecognitions()).resolves.toBeNull();

    mocks.rpc.mockResolvedValueOnce({
      data: [{ ...recognition, kind: "ranking_global" }],
      error: null,
    });
    await expect(loadMyRecognitions()).resolves.toBeNull();
  });
});
