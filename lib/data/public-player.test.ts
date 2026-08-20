import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: vi.fn(() => ({ storage: { from: vi.fn() } })),
}));

import {
  getPublicPlayer,
  getPublicRecognitionSummary,
} from "./public-player";

const summary = [
  {
    catalog_version: "recognition-v1",
    kind: "goal_recorded",
    recognition_count: 3,
  },
  {
    catalog_version: "recognition-v1",
    kind: "crowd_star",
    recognition_count: 1,
  },
];

describe("public player recognition summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      from: mocks.from,
      rpc: mocks.rpc,
    });
  });

  it("aceita somente versão, categoria e contagem do catálogo público", async () => {
    mocks.rpc.mockResolvedValue({ data: summary, error: null });

    await expect(getPublicRecognitionSummary("atleta-r10")).resolves.toEqual(
      summary,
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "get_public_recognition_summary",
      { requested_handle: "atleta-r10" },
    );
  });

  it("falha fechado para campo interno, categoria duplicada ou RPC indisponível", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ ...summary[0], team_id: crypto.randomUUID() }],
      error: null,
    });
    await expect(getPublicRecognitionSummary("atleta-r10")).resolves.toEqual(
      [],
    );

    mocks.rpc.mockResolvedValueOnce({
      data: [summary[0], summary[0]],
      error: null,
    });
    await expect(getPublicRecognitionSummary("atleta-r10")).resolves.toEqual(
      [],
    );

    mocks.rpc.mockRejectedValueOnce(new Error("schema indisponível"));
    await expect(getPublicRecognitionSummary("atleta-r10")).resolves.toEqual(
      [],
    );
  });

  it("preserva perfil e estatísticas quando o resumo não está disponível", async () => {
    const directoryQuery = createDirectoryQuery({
      data: {
        handle: "atleta-r10",
        display_name: "Atleta R10",
        preferred_name: "Atleta",
        bio: null,
        photo_path: null,
        positions: [],
      },
      error: null,
    });
    mocks.from.mockReturnValue(directoryQuery);
    mocks.rpc.mockImplementation((name: string) =>
      name === "get_public_player_statistics"
        ? Promise.resolve({
            data: [
              {
                matches_played: 2,
                goals: 1,
                assists: 0,
                yellow_cards: 0,
                red_cards: 0,
              },
            ],
            error: null,
          })
        : Promise.resolve({ data: null, error: { code: "PGRST202" } }),
    );

    await expect(getPublicPlayer("atleta-r10")).resolves.toMatchObject({
      handle: "atleta-r10",
      recognitions: [],
      statistics: { matches_played: 2, goals: 1 },
    });
  });
});

function createDirectoryQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}
