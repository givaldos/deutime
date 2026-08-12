import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  getPublicEventShareState,
  getPublicEventShareStateWithFallback,
} from "./public-event-share";

const publicId = "b4000000-0000-4000-8000-000000000081";
const event = {
  team_name: "Society United",
  team_timezone: "America/Sao_Paulo",
  title: "Treino semanal",
  kind: "training",
  sport_format: "society",
  starts_at: "2026-08-17T21:00:00+00:00",
  ends_at: "2026-08-17T22:30:00+00:00",
  status: "scheduled",
};

describe("fronteira pública da fase compartilhável", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it("não consulta o banco para ID público inválido", async () => {
    await expect(getPublicEventShareState("../segredo")).resolves.toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("preserva o fallback em banco N-1", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42883" } });
    await expect(getPublicEventShareState(publicId)).resolves.toBeNull();
  });

  it("aceita o contexto mínimo de chamada", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        phase: "call",
        event,
        lineup: null,
        match: null,
        voting: null,
        result: null,
      },
      error: null,
    });

    await expect(getPublicEventShareState(publicId)).resolves.toMatchObject({
      phase: "call",
      event: { team_name: "Society United" },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_public_event_share_state", {
      requested_public_id: publicId,
    });
  });

  it("aceita placar e fatos somente no formato público", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        phase: "live",
        event,
        lineup: null,
        match: {
          ordinal: 2,
          status: "live",
          public_mode: "live",
          sides: [
            { side_index: 1, label: "Verde", score: 2 },
            { side_index: 2, label: "Azul", score: 1 },
          ],
          events: [
            { kind: "goal", side_index: 1, minute: 12 },
            { kind: "yellow_card", side_index: 2, minute: 18 },
          ],
        },
        voting: null,
        result: null,
      },
      error: null,
    });

    await expect(getPublicEventShareState(publicId)).resolves.toMatchObject({
      phase: "live",
      match: { sides: [{ score: 2 }, { score: 1 }] },
    });
  });

  it("falha fechado diante de chave extra ou fase divergente", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        phase: "result",
        event: { ...event, capability: "segredo" },
        lineup: null,
        match: null,
        voting: null,
        result: {
          winner_name: "Neymar",
          vote_count: 2,
          vote_percentage: 66.7,
          total_votes: 3,
          tied: false,
        },
      },
      error: null,
    });

    await expect(getPublicEventShareState(publicId)).resolves.toBeNull();
  });

  it("não transforma falha de infraestrutura em ausência", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "08006" } });
    await expect(getPublicEventShareState(publicId)).rejects.toThrow(
      "Não foi possível carregar o contexto compartilhável.",
    );
  });

  it("oferece fallback redigido para os consumidores públicos", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "08006", message: `public_id=${publicId}` },
    });

    await expect(
      getPublicEventShareStateWithFallback(publicId),
    ).resolves.toBeNull();
    expect(error).toHaveBeenCalledWith(
      "public_event_share_state.observed",
      expect.objectContaining({
        phase: "fallback",
        fallback: true,
        durationMs: expect.any(Number),
        error: "projection_unavailable",
      }),
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain(publicId);
  });

  it("registra somente fase, fallback e duração agregados no sucesso", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.rpc.mockResolvedValue({
      data: {
        phase: "call",
        event,
        lineup: null,
        match: null,
        voting: null,
        result: null,
      },
      error: null,
    });

    await expect(
      getPublicEventShareStateWithFallback(publicId),
    ).resolves.toMatchObject({ phase: "call" });
    expect(info).toHaveBeenCalledWith(
      "public_event_share_state.observed",
      expect.objectContaining({
        phase: "call",
        fallback: false,
        durationMs: expect.any(Number),
        error: "none",
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(publicId);
    expect(JSON.stringify(info.mock.calls)).not.toContain("Society United");
  });
});
