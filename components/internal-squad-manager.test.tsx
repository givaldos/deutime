import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/settings/internal-squad-actions", () => ({
  saveInternalSquads: vi.fn(),
}));

import { InternalSquadManager } from "./internal-squad-manager";

describe("InternalSquadManager", () => {
  it("centraliza identidade e mantém uma única ação de salvar", () => {
    const html = renderToStaticMarkup(
      <InternalSquadManager
        teamId="d7200000-0000-4000-8000-000000000001"
        teamSlug="society-united"
        initialSquads={[
          { id: "d7600000-0000-4000-8000-000000000001", name: "Azul", color: "#0D9488", badgeKey: "stripes", sortOrder: 1 },
          { id: "d7600000-0000-4000-8000-000000000002", name: "Branco", color: "#2563EB", badgeKey: "sash", sortOrder: 2 },
        ]}
      />,
    );
    expect(html).toContain("Os times da casa");
    expect(html).toContain("Escolha o escudo");
    expect(html).toContain("Listras");
    expect(html).toContain("Faixa");
    expect(html.match(/Salvar equipes/g)).toHaveLength(1);
    expect(html).not.toContain("Salvar rascunho");
  });

  it("expõe dois padrões distintos quando a agenda profissional está ativa", () => {
    const html = renderToStaticMarkup(
      <InternalSquadManager
        teamId="d7200000-0000-4000-8000-000000000001"
        teamSlug="society-united"
        professionalSchedulingEnabled
        initialDefaultHomeTeamId="d7600000-0000-4000-8000-000000000001"
        initialDefaultAwayTeamId="d7600000-0000-4000-8000-000000000002"
        initialSquads={[
          { id: "d7600000-0000-4000-8000-000000000001", name: "Azul", color: "#0D9488", badgeKey: "stripes", sortOrder: 1 },
          { id: "d7600000-0000-4000-8000-000000000002", name: "Branco", color: "#2563EB", badgeKey: "sash", sortOrder: 2 },
        ]}
      />,
    );
    expect(html).toContain("Equipes padrão dos novos jogos");
    expect(html).toContain('name="defaultHomeTeamId"');
    expect(html).toContain('name="defaultAwayTeamId"');
    expect(html).toContain("podem ser trocadas em cada jogo");
  });
});
