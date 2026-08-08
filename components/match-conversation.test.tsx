import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { MatchConversation } from "./match-conversation";

const eventId = "06300000-0000-4000-8000-000000000001";
const matchId = "06400000-0000-4000-8000-000000000001";
const rootId = "06500000-0000-4000-8000-000000000001";
const requestId = "06600000-0000-4000-8000-000000000001";

describe("MatchConversation", () => {
  it("prioriza o primeiro comentário e explica privacidade e prazo", () => {
    const html = renderToStaticMarkup(
      <MatchConversation
        eventId={eventId}
        conversation={{
          matchId,
          ordinal: 1,
          writable: true,
          closesAt: "2026-08-15T20:00:00.000Z",
          comments: [],
        }}
        timeZone="America/Sao_Paulo"
        rootRequestId={requestId}
        replyRequestIds={{}}
      />,
    );

    expect(html).toContain("Conversa da súmula");
    expect(html).toContain("Espaço privado");
    expect(html).toContain("A conversa está vazia");
    expect(html).toContain("Escreva para o time");
    expect(html).toContain("Novas mensagens até");
  });

  it("fica somente leitura depois do fechamento", () => {
    const html = renderToStaticMarkup(
      <MatchConversation
        eventId={eventId}
        conversation={{
          matchId,
          ordinal: 2,
          writable: false,
          closesAt: "2026-08-15T20:00:00.000Z",
          comments: [],
        }}
        timeZone="America/Sao_Paulo"
        rootRequestId={requestId}
        replyRequestIds={{}}
      />,
    );

    expect(html).toContain("continua disponível para leitura");
    expect(html).not.toContain("Como foi a partida?");
  });

  it("preserva resposta e oculta o texto removido da raiz", () => {
    const html = renderToStaticMarkup(
      <MatchConversation
        eventId={eventId}
        conversation={{
          matchId,
          ordinal: 1,
          writable: true,
          closesAt: null,
          comments: [
            {
              id: rootId,
              parentId: null,
              authorName: "Bia",
              body: null,
              status: "author_deleted",
              createdAt: "2026-08-08T20:00:00.000Z",
              canDelete: false,
            },
            {
              id: "06500000-0000-4000-8000-000000000002",
              parentId: rootId,
              authorName: "Caio",
              body: "A resposta continua aqui.",
              status: "active",
              createdAt: "2026-08-08T20:05:00.000Z",
              canDelete: false,
            },
          ],
        }}
        timeZone="America/Sao_Paulo"
        rootRequestId={requestId}
        replyRequestIds={{
          [rootId]: "06600000-0000-4000-8000-000000000002",
        }}
      />,
    );

    expect(html).toContain("Comentário removido");
    expect(html).toContain("A resposta continua aqui.");
  });
});
