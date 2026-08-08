import { describe, expect, it } from "vitest";
import {
  createMatchCommentSchema,
  deleteMatchCommentSchema,
  reportMatchCommentSchema,
} from "./validation";

const eventId = "06300000-0000-4000-8000-000000000001";
const matchId = "06400000-0000-4000-8000-000000000001";
const commentId = "06500000-0000-4000-8000-000000000001";
const idempotencyKey = "06600000-0000-4000-8000-000000000001";

describe("validação da conversa da súmula", () => {
  it("aceita comentário raiz e resposta com IDs válidos", () => {
    expect(
      createMatchCommentSchema.safeParse({
        eventId,
        matchId,
        body: "Grande partida!",
        idempotencyKey,
      }).success,
    ).toBe(true);
    expect(
      createMatchCommentSchema.safeParse({
        eventId,
        matchId,
        parentCommentId: commentId,
        body: "Também achei.",
        idempotencyKey,
      }).success,
    ).toBe(true);
  });

  it.each(["", "https://deutime.app", "www.exemplo.com", "<b>gol</b>"])(
    "rejeita conteúdo fora do contrato: %s",
    (body) => {
      expect(
        createMatchCommentSchema.safeParse({
          eventId,
          matchId,
          body,
          idempotencyKey,
        }).success,
      ).toBe(false);
    },
  );

  it("limita comentário e motivo de denúncia", () => {
    expect(
      createMatchCommentSchema.safeParse({
        eventId,
        matchId,
        body: "a".repeat(1001),
        idempotencyKey,
      }).success,
    ).toBe(false);
    expect(
      reportMatchCommentSchema.safeParse({ eventId, commentId, reason: "x" })
        .success,
    ).toBe(false);
  });

  it("valida remoção e denúncia sem aceitar identificadores livres", () => {
    expect(
      deleteMatchCommentSchema.safeParse({ eventId, commentId }).success,
    ).toBe(true);
    expect(
      reportMatchCommentSchema.safeParse({
        eventId,
        commentId,
        reason: "Mensagem desrespeitosa",
      }).success,
    ).toBe(true);
    expect(
      deleteMatchCommentSchema.safeParse({ eventId, commentId: "comentário" })
        .success,
    ).toBe(false);
  });
});
