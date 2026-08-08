import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { castCraqueVoteAction } from "./actions";

const vote = {
  eventId: "05300000-0000-4000-8000-000000000001",
  matchId: "05400000-0000-4000-8000-000000000001",
  candidateAthleteId: "05200000-0000-4000-8000-000000000001",
};

function voteForm(overrides: Partial<typeof vote> = {}) {
  const values = { ...vote, ...overrides };
  const formData = new FormData();
  formData.set("eventId", values.eventId);
  formData.set("matchId", values.matchId);
  formData.set("candidateAthleteId", values.candidateAthleteId);
  return formData;
}

describe("castCraqueVoteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
  });

  it("delega somente partida e candidato à RPC segura", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          vote_id: "05600000-0000-4000-8000-000000000001",
          receipt_token: "a".repeat(64),
          receipt_expires_at: "2026-08-15T20:00:00.000Z",
        },
      ],
      error: null,
    });

    await expect(castCraqueVoteAction({}, voteForm())).resolves.toEqual({
      outcome: "success",
      message: "Voto computado. Sua escolha continua anônima.",
      receiptToken: "a".repeat(64),
      receiptExpiresAt: "2026-08-15T20:00:00.000Z",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("cast_craque_vote", {
      requested_match_id: vote.matchId,
      requested_candidate_athlete_id: vote.candidateAthleteId,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/me/agenda/${vote.eventId}`,
    );
  });

  it("rejeita IDs inválidos antes do banco", async () => {
    await expect(
      castCraqueVoteAction({}, voteForm({ matchId: "partida" })),
    ).resolves.toEqual({
      outcome: "unavailable",
      message: "Esta votação não está disponível.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("traduz duplicidade sem revelar a cédula", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "Already voted" },
    });

    await expect(castCraqueVoteAction({}, voteForm())).resolves.toEqual({
      outcome: "already_voted",
      message: "Seu voto já foi computado nesta partida.",
    });
  });

  it.each(["42501", "55000"])(
    "falha fechado para erro %s",
    async (code) => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { code, message: "detalhe interno" },
      });

      await expect(castCraqueVoteAction({}, voteForm())).resolves.toEqual({
        outcome: "unavailable",
        message: "Esta votação não está disponível para você agora.",
      });
    },
  );
});
