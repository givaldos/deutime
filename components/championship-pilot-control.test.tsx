import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/app/app/[teamSlug]/settings/championship-pilot-actions",
  () => ({ setChampionshipPilotState: vi.fn() }),
);

import { ChampionshipPilotControl } from "./championship-pilot-control";

describe("controle visual do piloto de campeonatos", () => {
  it("exige confirmação explícita antes de ativar a coorte", () => {
    const html = renderToStaticMarkup(
      <ChampionshipPilotControl
        teamName="Demo Campo"
        teamSlug="demo-campo"
        enabled={false}
      />,
    );
    expect(html).toContain("Agenda e partidas continuam disponíveis");
    expect(html).toContain("Ativar somente neste time");
    expect(html).toContain('name="confirmation"');
    expect(html).toContain("required");
    expect(html).not.toContain("CHAMPIONSHIP_PILOT_TEAM_ID");
  });

  it("oferece rollback preservando os fatos quando ativo", () => {
    const html = renderToStaticMarkup(
      <ChampionshipPilotControl
        teamName="Demo Campo"
        teamSlug="demo-campo"
        enabled
      />,
    );
    expect(html).toContain("Campeonatos ativos neste time");
    expect(html).toContain("Desligar campeonatos");
    expect(html).toContain('value="false"');
    expect(html).toContain("sem apagar confrontos, partidas ou súmulas");
  });
});
