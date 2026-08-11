import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/events/lineup-actions", () => ({
  saveEventLineupDraft: vi.fn(),
  linkEventLineupSquadToMatchSide: vi.fn(),
  publishEventLineup: vi.fn(),
  withdrawEventLineupPublication: vi.fn(),
}));

import { EventLineupEditor } from "./event-lineup-editor";

const squads = [
  { id: "d7600000-0000-4000-8000-000000000001", name: "Azul", color: "#0D9488", sortOrder: 1, internalTeamId: "d7800000-0000-4000-8000-000000000001", badgeKey: "stripes" as const },
  { id: "d7600000-0000-4000-8000-000000000002", name: "Branco", color: "#2563EB", sortOrder: 2, internalTeamId: "d7800000-0000-4000-8000-000000000002", badgeKey: "sash" as const },
];

describe("EventLineupEditor", () => {
  it("oferece o caminho mobile por toque sem depender de arrastar", () => {
    const html = renderToStaticMarkup(
      <EventLineupEditor
        teamId="d7200000-0000-4000-8000-000000000001"
        teamSlug="society-united"
        eventId="d7300000-0000-4000-8000-000000000001"
        initialRequestId="d7500000-0000-4000-8000-000000000001"
        initialSquads={squads}
        athletes={[
          { id: "d7400000-0000-4000-8000-000000000001", name: "Neymar", shirtNumber: 10, destination: "d7600000-0000-4000-8000-000000000001", isGoalkeeper: false },
          { id: "d7400000-0000-4000-8000-000000000002", name: "Pelé", shirtNumber: 9, destination: "unassigned", isGoalkeeper: false },
        ]}
        matchSides={[]}
      />,
    );

    expect(html).toContain("Dividir os times");
    expect(html).toContain("Ajuste se precisar");
    expect(html).toContain("Refazer divisão automática");
    expect(html).toContain("Mover → Branco");
    expect(html).toContain("Escolher time manualmente");
    expect(html).toContain("Destino de Neymar");
    expect(html).toContain("Fora desta divisão");
    expect(html).toContain("Sem time");
    expect(html).toContain("min-h-12");
    expect(html).toContain("Salvar divisão");
    expect(html).not.toContain("Salvar estes times como padrão");
    expect(html).not.toContain("Nome do time");
    expect(html).not.toContain("drag");
    expect(html).not.toContain("telefone");
  });

  it("mostra publicação somente depois que a divisão foi salva", () => {
    const html = renderToStaticMarkup(
      <EventLineupEditor
        teamId="d7200000-0000-4000-8000-000000000001"
        teamSlug="society-united"
        eventId="d7300000-0000-4000-8000-000000000001"
        initialRequestId="d7500000-0000-4000-8000-000000000001"
        initialSquads={squads}
        athletes={[]}
        matchSides={[]}
        publicId="e7310000-0000-4000-8000-000000000001"
        canPublish
      />,
    );
    expect(html).toContain("Salvar divisão");
    expect(html).not.toContain("Publicar para a galera");

    const savedHtml = renderToStaticMarkup(
      <EventLineupEditor
        teamId="d7200000-0000-4000-8000-000000000001"
        teamSlug="society-united"
        eventId="d7300000-0000-4000-8000-000000000001"
        initialRequestId="d7500000-0000-4000-8000-000000000001"
        initialSquads={squads}
        athletes={[]}
        matchSides={[]}
        publicId="e7310000-0000-4000-8000-000000000001"
        canPublish
        hasSavedDraft
      />,
    );
    expect(savedHtml).not.toContain("Salvar divisão");
    expect(savedHtml).toContain("Publicar para a galera");
  });

  it("explica que o vínculo com partida não altera presença", () => {
    const html = renderToStaticMarkup(
      <EventLineupEditor
        teamId="d7200000-0000-4000-8000-000000000001"
        teamSlug="society-united"
        eventId="d7300000-0000-4000-8000-000000000001"
        initialRequestId="d7500000-0000-4000-8000-000000000001"
        initialSquads={squads}
        athletes={[]}
        matchSides={[{ matchId: "d7700000-0000-4000-8000-000000000001", matchOrdinal: 1, sideIndex: 1, label: "Casa", squadId: null }]}
      />,
    );
    expect(html).toContain(">Partidas<");
    expect(html).toContain("não confirma presença");
    expect(html).toContain("não cria participação real");
    expect(html).toContain("Escolha um time salvo");
  });

  it("oferece publicação somente para owner/admin e explica o consentimento", () => {
    const html = renderToStaticMarkup(
      <EventLineupEditor
        teamId="d7200000-0000-4000-8000-000000000001"
        teamSlug="society-united"
        eventId="d7300000-0000-4000-8000-000000000001"
        publicId="e7310000-0000-4000-8000-000000000001"
        initialRequestId="d7500000-0000-4000-8000-000000000001"
        initialSquads={squads}
        athletes={[]}
        matchSides={[]}
        canPublish
        activeRevision={{ revision: 2, publishedAt: "2026-08-11T12:00:00Z" }}
        hasSavedDraft
      />,
    );
    expect(html).toContain("Divisão compartilhada · versão 2");
    expect(html).toContain("Atualizar publicação");
    expect(html).toContain("Ocultar publicação");
    expect(html).toContain("somente nomes de atletas que autorizaram");
  });
});
