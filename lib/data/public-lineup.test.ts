import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { getPublicEventLineup } from "./public-lineup";

describe("fronteira pública da divisão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it("não consulta o banco para ID público inválido", async () => {
    await expect(getPublicEventLineup("../segredo")).resolves.toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("falha fechado em banco N-1 sem a RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42883" } });
    await expect(getPublicEventLineup("b4000000-0000-4000-8000-000000000011")).resolves.toBeNull();
  });

  it("descarta payload fora da projeção mínima", async () => {
    mocks.rpc.mockResolvedValue({ data: { revision: 1, squads: [{ athlete_id: "privado" }] }, error: null });
    await expect(getPublicEventLineup("b4000000-0000-4000-8000-000000000012")).resolves.toBeNull();
  });

  it("aceita somente revisão, times e nomes esportivos", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        revision: 2,
        published_at: "2026-08-11T12:00:00+00:00",
        squads: [
          { name: "Verde", color: "#0D9488", sort_order: 1, athletes: [{ name: "  Neymar da Silva  ", sort_order: 1 }] },
          { name: "Azul", color: null, sort_order: 2, athletes: [] },
        ],
      },
      error: null,
    });
    await expect(getPublicEventLineup("b4000000-0000-4000-8000-000000000013")).resolves.toMatchObject({
      revision: 2,
      squads: [{ name: "Verde", athletes: [{ name: "Neymar" }] }, { name: "Azul" }],
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_public_event_lineup", {
      requested_public_id: "b4000000-0000-4000-8000-000000000013",
    });
  });

  it("não esconde falha de infraestrutura como ausência", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "08006" } });
    await expect(getPublicEventLineup("b4000000-0000-4000-8000-000000000014")).rejects.toThrow(
      "Não foi possível carregar os times publicados.",
    );
  });
});
