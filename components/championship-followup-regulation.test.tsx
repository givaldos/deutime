import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/championship-forms", () => ({
  ChampionshipRegulationEditor: () => <div>Editor do regulamento</div>,
  ReopenChampionshipRegulationControl: () => <div>Reabrir para editar</div>,
}));
vi.mock("@/components/championship-public-controls", () => ({
  ChampionshipPublicControls: () => <div>Página compartilhável</div>,
}));

import { ChampionshipRegulationView } from "./championship-followup-regulation";
import type { ChampionshipFollowupRegulation } from "@/lib/data/championship-followup";

const championship = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Copa do Campo",
  format: "groups_knockout" as const,
  status: "active" as const,
  status_label: "Em andamento",
  public_mode: "private" as const,
};
const regulation: ChampionshipFollowupRegulation = {
  id: championship.id,
  name: championship.name,
  format: championship.format,
  status: championship.status,
  public_id: "33333333-3333-4333-8333-333333333333",
  public_mode: championship.public_mode,
  win_points: 3,
  draw_points: 1,
  loss_points: 0,
  tiebreak_order: ["wins", "goal_difference", "goals_for", "head_to_head"],
  group_count: 4,
  qualifiers_per_group: 2,
  current_version_number: 2,
  version_count: 2,
};

describe("regulamento no acompanhamento", () => {
  it("mostra o resumo antes dos controles e preserva versão e formato", () => {
    const html = renderToStaticMarkup(<ChampionshipRegulationView
      teamId="11111111-1111-4111-8111-111111111111"
      teamSlug="campo-fc"
      returnTo={null}
      championship={championship}
      regulation={regulation}
      canConfigure
      professionalSchedulingEnabled
      publicUrl="https://deutime.app/c/33333333-3333-4333-8333-333333333333"
    />);
    expect(html.indexOf("Regra vigente")).toBeLessThan(html.indexOf("Alteração protegida"));
    expect(html).toContain("4 grupos · 2 classificados por grupo");
    expect(html).toContain("Versão 2");
    expect(html).toContain("2 versões preservadas");
    expect(html).toContain("Reabrir para editar");
    expect(html).toContain("Página compartilhável");
  });

  it("mantém manager somente em leitura", () => {
    const html = renderToStaticMarkup(<ChampionshipRegulationView
      teamId="11111111-1111-4111-8111-111111111111"
      teamSlug="campo-fc"
      returnTo={null}
      championship={championship}
      regulation={regulation}
      canConfigure={false}
      professionalSchedulingEnabled
      publicUrl="https://deutime.app/c/33333333-3333-4333-8333-333333333333"
    />);
    expect(html).toContain("Você pode consultar o regulamento");
    expect(html).not.toContain("Reabrir para editar");
    expect(html).not.toContain("Página compartilhável");
  });
});
