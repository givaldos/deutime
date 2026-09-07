import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/championships/actions", () => ({
  finishChampionshipSetup: vi.fn(),
}));

import {
  buildChampionshipSchedule,
  ChampionshipSetupWizard,
} from "./championship-setup-wizard";

const fixtures = [
  { id: "f1", roundNumber: 1, ordinal: 1, sideOneName: "Verde", sideTwoName: "Azul" },
  { id: "f2", roundNumber: 1, ordinal: 2, sideOneName: "Amarelo", sideTwoName: "Branco" },
  { id: "f3", roundNumber: 2, ordinal: 3, sideOneName: "Verde", sideTwoName: "Branco" },
];

describe("assistente simples do campeonato", () => {
  it("começa pelos convocados sem linguagem de rascunho", () => {
    const html = renderToStaticMarkup(
      <ChampionshipSetupWizard
        teamId="e9100000-0000-4000-8000-000000000001"
        teamSlug="liga-a"
        championshipId="e9200000-0000-4000-8000-000000000001"
        teamTimezone="America/Sao_Paulo"
        sportFormat="society"
        participants={[
          { id: "p1", name: "Verde", internalTeamId: "s1" },
          { id: "p2", name: "Azul", internalTeamId: "s2" },
        ]}
        athletes={[{ id: "a1", name: "Ana", shirtNumber: 10 }]}
        fixtures={fixtures}
        defaultStartLocal="2026-09-08T19:00"
      />,
    );

    expect(html).toContain("Etapa 4 de 5");
    expect(html).toContain("Quem joga em cada equipe?");
    expect(html).toContain("Não convocado");
    expect(html).toContain("Próximo: agenda");
    expect(html.toLocaleLowerCase("pt-BR")).not.toContain("rascunho");
  });

  it("agenda jogos da rodada em sequência e avança a próxima rodada", () => {
    expect(buildChampionshipSchedule(fixtures, "2026-09-08T19:00", 7, 120)).toEqual([
      { fixtureId: "f1", startsAtLocal: "2026-09-08T19:00" },
      { fixtureId: "f2", startsAtLocal: "2026-09-08T21:00" },
      { fixtureId: "f3", startsAtLocal: "2026-09-15T19:00" },
    ]);
  });
});
