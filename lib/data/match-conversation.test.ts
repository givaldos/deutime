import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: {
    featureEnabled: boolean;
    matches: unknown[];
    matchesError: { code?: string } | null;
    rpcResults: Record<string, { data: unknown; error: unknown }>;
  } = {
    featureEnabled: false,
    matches: [],
    matchesError: null,
    rpcResults: {},
  };

  const order = vi.fn(async () => ({
    data: state.matches,
    error: state.matchesError,
  }));
  const builder: { eq: ReturnType<typeof vi.fn>; order: typeof order } = {
    eq: vi.fn(),
    order,
  };
  builder.eq.mockImplementation(() => builder);
  const select = vi.fn(() => builder);
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn(async (name: string, args: { requested_match_id: string }) =>
    state.rpcResults[`${name}:${args.requested_match_id}`] ?? {
      data: null,
      error: null,
    },
  );
  const createClient = vi.fn(async () => ({ from, rpc }));
  const isTeamFeatureEnabled = vi.fn(async () => state.featureEnabled);

  return {
    state,
    order,
    builder,
    select,
    from,
    rpc,
    createClient,
    isTeamFeatureEnabled,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: mocks.isTeamFeatureEnabled,
}));

import { getMatchConversations } from "./match-conversation";

const teamId = "06100000-0000-4000-8000-000000000001";
const eventId = "06300000-0000-4000-8000-000000000001";
const matchA = "06400000-0000-4000-8000-000000000001";
const matchB = "06400000-0000-4000-8000-000000000002";

describe("match conversation data boundary", () => {
  beforeEach(() => {
    mocks.state.featureEnabled = false;
    mocks.state.matches = [];
    mocks.state.matchesError = null;
    mocks.state.rpcResults = {};
    vi.clearAllMocks();
    mocks.builder.eq.mockImplementation(() => mocks.builder);
  });

  it("não consulta partidas quando comments está desligada", async () => {
    await expect(getMatchConversations(teamId, eventId)).resolves.toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("omite a capacidade quando o banco N-1 ainda não possui a RPC de estado", async () => {
    mocks.state.featureEnabled = true;
    mocks.state.matches = [{ id: matchA, ordinal: 1 }];
    mocks.state.rpcResults[`get_match_conversation_state:${matchA}`] = {
      data: null,
      error: { code: "PGRST202" },
    };

    await expect(getMatchConversations(teamId, eventId)).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "get_match_conversation",
      expect.anything(),
    );
  });

  it("retorna somente partidas autorizadas e a projeção sem identidade técnica", async () => {
    mocks.state.featureEnabled = true;
    mocks.state.matches = [
      { id: matchA, ordinal: 1 },
      { id: matchB, ordinal: 2 },
    ];
    mocks.state.rpcResults[`get_match_conversation_state:${matchA}`] = {
      data: [
        {
          accessible: true,
          writable: true,
          closes_at: "2026-08-15T20:00:00.000Z",
        },
      ],
      error: null,
    };
    mocks.state.rpcResults[`get_match_conversation_state:${matchB}`] = {
      data: [{ accessible: false, writable: false, closes_at: null }],
      error: null,
    };
    mocks.state.rpcResults[`get_match_conversation:${matchA}`] = {
      data: [
        {
          comment_id: "06500000-0000-4000-8000-000000000001",
          parent_comment_id: null,
          author_display_name: "Bia",
          body: "Jogão!",
          status: "active",
          created_at: "2026-08-08T20:00:00.000Z",
          can_delete: false,
        },
      ],
      error: null,
    };

    await expect(getMatchConversations(teamId, eventId)).resolves.toEqual([
      {
        matchId: matchA,
        ordinal: 1,
        writable: true,
        closesAt: "2026-08-15T20:00:00.000Z",
        comments: [
          {
            id: "06500000-0000-4000-8000-000000000001",
            parentId: null,
            authorName: "Bia",
            body: "Jogão!",
            status: "active",
            createdAt: "2026-08-08T20:00:00.000Z",
            canDelete: false,
          },
        ],
      },
    ]);
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "get_match_conversation",
      { requested_match_id: matchB },
    );
  });

  it("falha fechado se a projeção privada não puder ser lida", async () => {
    mocks.state.featureEnabled = true;
    mocks.state.matches = [{ id: matchA, ordinal: 1 }];
    mocks.state.rpcResults[`get_match_conversation_state:${matchA}`] = {
      data: [{ accessible: true, writable: false, closes_at: null }],
      error: null,
    };
    mocks.state.rpcResults[`get_match_conversation:${matchA}`] = {
      data: null,
      error: { code: "42501" },
    };

    await expect(getMatchConversations(teamId, eventId)).resolves.toBeNull();
  });
});
