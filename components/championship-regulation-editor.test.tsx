import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/championships/actions", () => ({
  addChampionshipParticipant: vi.fn(),
  advanceChampionshipGroups: vi.fn(),
  createChampionship: vi.fn(),
  decideChampionshipQualifier: vi.fn(),
  generateChampionshipFixtures: vi.fn(),
  linkChampionshipFixture: vi.fn(),
  publishChampionshipFormat: vi.fn(),
  releaseChampionshipFixture: vi.fn(),
  reopenChampionshipRegulation: vi.fn(),
  resolveChampionshipFixture: vi.fn(),
  updateChampionshipRegulation: vi.fn(),
  withdrawChampionshipParticipant: vi.fn(),
}));

import {
  ChampionshipRegulationEditor,
  CreateChampionshipForm,
  ReopenChampionshipRegulationControl,
} from "./championship-forms";

describe("regulamento profissional acessível", () => {
  it("oferece subir e descer para todo o catálogo sem repetição", () => {
    const html = renderToStaticMarkup(
      <CreateChampionshipForm
        teamId="e9100000-0000-4000-8000-000000000001"
        teamSlug="liga-a"
        professionalSchedulingEnabled
        internalSquads={[]}
      />,
    );

    expect(html.match(/name="tiebreakOrder"/g)).toHaveLength(4);
    expect(html).toContain("Subir Vitórias");
    expect(html).toContain("Descer Confronto direto");
    expect(html).toContain("mini-torneio");
    expect(html).not.toContain("arraste");
  });

  it("preserva a ordem atual no editor e explica a versão seguinte", () => {
    const html = renderToStaticMarkup(
      <ChampionshipRegulationEditor
        teamId="e9100000-0000-4000-8000-000000000001"
        teamSlug="liga-a"
        championshipId="e9200000-0000-4000-8000-000000000001"
        winPoints={3}
        drawPoints={1}
        lossPoints={0}
        tiebreakOrder={["head_to_head", "wins", "goals_for", "goal_difference"]}
      />,
    );

    expect(html.indexOf('value="head_to_head"')).toBeLessThan(html.indexOf('value="wins"'));
    expect(html).toContain("Salvar regulamento");
    expect(html).toContain("Pontuação principal");
  });

  it("avisa que reabrir recolhe a página e depende da ausência de fatos", () => {
    const html = renderToStaticMarkup(
      <ReopenChampionshipRegulationControl
        teamId="e9100000-0000-4000-8000-000000000001"
        teamSlug="liga-a"
        championshipId="e9200000-0000-4000-8000-000000000001"
      />,
    );
    expect(html).toContain("antes do primeiro fato esportivo");
    expect(html).toContain("página pública será recolhida");
    expect(html).toContain("Reabrir para editar");
  });
});
