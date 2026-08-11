import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/events/lineup-actions", () => ({
  saveEventLineupDraft: vi.fn(),
  linkEventLineupSquadToMatchSide: vi.fn(),
}));

import { EventLineupEditor } from "./event-lineup-editor";

const squads = [
  { id: "d7600000-0000-4000-8000-000000000001", name: "Azul", color: "#0D9488", sortOrder: 1 },
  { id: "d7600000-0000-4000-8000-000000000002", name: "Branco", color: "#2563EB", sortOrder: 2 },
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
          { id: "d7400000-0000-4000-8000-000000000001", name: "Neymar", shirtNumber: 10, destination: "d7600000-0000-4000-8000-000000000001" },
          { id: "d7400000-0000-4000-8000-000000000002", name: "Pelé", shirtNumber: 9, destination: "unassigned" },
        ]}
        matchSides={[]}
      />,
    );

    expect(html).toContain("Dividir os times");
    expect(html).toContain("Configure de 2 a 12 times");
    expect(html).toContain("Distribua os confirmados");
    expect(html).toContain("Destino de Neymar");
    expect(html).toContain("Fora desta divisão");
    expect(html).toContain("Sem time");
    expect(html).toContain("min-h-12");
    expect(html).toContain("Salvar rascunho");
    expect(html).not.toContain("drag");
    expect(html).not.toContain("telefone");
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
    expect(html).toContain("Relacione com as partidas");
    expect(html).toContain("não confirma presença");
    expect(html).toContain("não cria participação real");
    expect(html).toContain("Escolha um time salvo");
  });
});
