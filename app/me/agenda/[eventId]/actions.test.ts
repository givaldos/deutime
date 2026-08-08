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

import {
  castCraqueVoteAction,
  createMatchCommentAction,
  deleteMatchCommentAction,
  reportMatchCommentAction,
} from "./actions";

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

const conversation = {
  eventId: "06300000-0000-4000-8000-000000000001",
  matchId: "06400000-0000-4000-8000-000000000001",
  commentId: "06500000-0000-4000-8000-000000000001",
  idempotencyKey: "06600000-0000-4000-8000-000000000001",
};

function commentForm(
  overrides: Partial<typeof conversation & { body: string; parentCommentId: string }> = {},
) {
  const formData = new FormData();
  formData.set("eventId", overrides.eventId ?? conversation.eventId);
  formData.set("matchId", overrides.matchId ?? conversation.matchId);
  formData.set(
    "idempotencyKey",
    overrides.idempotencyKey ?? conversation.idempotencyKey,
  );
  formData.set("body", overrides.body ?? "Grande partida!");
  if (overrides.parentCommentId) {
    formData.set("parentCommentId", overrides.parentCommentId);
  }
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

describe("ações da conversa da súmula", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
  });

  it("publica somente conteúdo e IDs operacionais, sem aceitar autoria do cliente", async () => {
    mocks.rpc.mockResolvedValue({ data: conversation.commentId, error: null });

    await expect(
      createMatchCommentAction({}, commentForm()),
    ).resolves.toEqual({
      outcome: "success",
      message: "Comentário publicado.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("create_match_comment", {
      requested_match_id: conversation.matchId,
      requested_body: "Grande partida!",
      requested_idempotency_key: conversation.idempotencyKey,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/me/agenda/${conversation.eventId}`,
    );
  });

  it("delega resposta usando apenas a raiz validada", async () => {
    mocks.rpc.mockResolvedValue({ data: conversation.commentId, error: null });
    const parentCommentId = "06500000-0000-4000-8000-000000000002";

    await createMatchCommentAction(
      {},
      commentForm({ parentCommentId, body: "Também achei!" }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("create_match_comment", {
      requested_match_id: conversation.matchId,
      requested_body: "Também achei!",
      requested_idempotency_key: conversation.idempotencyKey,
      requested_parent_comment_id: parentCommentId,
    });
  });

  it("rejeita link antes de chamar o banco", async () => {
    await expect(
      createMatchCommentAction({}, commentForm({ body: "Veja https://x.test" })),
    ).resolves.toMatchObject({ outcome: "invalid" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "unavailable"],
    ["55000", "unavailable"],
    ["22023", "invalid"],
    ["54000", "rate_limited"],
    ["XX000", "error"],
  ])("traduz erro %s sem expor mensagem interna", async (code, outcome) => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code, message: "detalhe interno" },
    });

    await expect(
      createMatchCommentAction({}, commentForm()),
    ).resolves.toMatchObject({ outcome });
  });

  it("remove somente pelo ID e revalida a agenda", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const formData = new FormData();
    formData.set("eventId", conversation.eventId);
    formData.set("commentId", conversation.commentId);

    await expect(deleteMatchCommentAction({}, formData)).resolves.toMatchObject({
      outcome: "success",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("delete_my_match_comment", {
      requested_comment_id: conversation.commentId,
    });
  });

  it("envia denúncia sem autoria ou conteúdo do comentário", async () => {
    mocks.rpc.mockResolvedValue({ data: "report-id", error: null });
    const formData = new FormData();
    formData.set("eventId", conversation.eventId);
    formData.set("commentId", conversation.commentId);
    formData.set("reason", "Mensagem desrespeitosa");

    await expect(reportMatchCommentAction({}, formData)).resolves.toMatchObject({
      outcome: "success",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("report_match_comment", {
      requested_comment_id: conversation.commentId,
      requested_reason: "Mensagem desrespeitosa",
    });
  });
});
