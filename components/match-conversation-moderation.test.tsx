import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { MatchConversationModeration } from "./match-conversation-moderation";

const base = {
  matchId: "07400000-0000-4000-8000-000000000001",
  matchOrdinal: 1,
  commentId: "07500000-0000-4000-8000-000000000001",
  parentCommentId: null,
  authorName: "Bia",
  body: "Mensagem em análise",
  status: "active" as const,
  createdAt: "2026-08-08T20:00:00.000Z",
  moderationReason: null,
  reportCount: 1,
  reportReasons: ["Mensagem desrespeitosa"],
};

describe("MatchConversationModeration", () => {
  it("explica a decisão humana e exige motivo para ocultar", () => {
    const html = renderToStaticMarkup(
      <MatchConversationModeration
        items={[base]}
        eventId="07300000-0000-4000-8000-000000000001"
        teamSlug="campo-fc"
        timeZone="America/Sao_Paulo"
      />,
    );

    expect(html).toContain("Moderação da conversa");
    expect(html).toContain("não ocultam mensagens automaticamente");
    expect(html).toContain("Mensagem em análise");
    expect(html).toContain("Motivo da ocultação");
    expect(html).toContain("Ocultar comentário");
  });

  it("oferece restauração para conteúdo ocultado", () => {
    const html = renderToStaticMarkup(
      <MatchConversationModeration
        items={[
          {
            ...base,
            status: "moderated",
            moderationReason: "Ataque pessoal",
          },
        ]}
        eventId="07300000-0000-4000-8000-000000000001"
        teamSlug="campo-fc"
        timeZone="America/Sao_Paulo"
      />,
    );

    expect(html).toContain("Ocultado por:");
    expect(html).toContain("Motivo da restauração");
    expect(html).toContain("Restaurar comentário");
  });

  it("mostra estado vazio sem expor a capacidade quando desligada", () => {
    const html = renderToStaticMarkup(
      <MatchConversationModeration
        items={[]}
        eventId="07300000-0000-4000-8000-000000000001"
        teamSlug="campo-fc"
        timeZone="America/Sao_Paulo"
      />,
    );

    expect(html).toContain("Nenhuma revisão pendente");
  });
});
