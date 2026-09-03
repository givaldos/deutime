import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/app/app/[teamSlug]/settings/professional-scheduling-pilot-actions",
  () => ({ setProfessionalSchedulingPilotState: vi.fn() }),
);

import { ProfessionalSchedulingPilotControl } from "./professional-scheduling-pilot-control";

describe("controle visual do piloto da agenda profissional", () => {
  it("exige confirmação e mantém o fallback visível antes da ativação", () => {
    const html = renderToStaticMarkup(
      <ProfessionalSchedulingPilotControl
        teamName="Demo Campo"
        teamSlug="demo-campo"
        enabled={false}
      />,
    );
    expect(html).toContain("Agenda clássica e campeonatos atuais continuam disponíveis");
    expect(html).toContain("Ativar somente neste time");
    expect(html).toContain('name="confirmation"');
    expect(html).toContain("required");
    expect(html).not.toContain("R13_PILOT_TEAM_ID");
  });

  it("oferece rollback sem apagar fatos quando ativo", () => {
    const html = renderToStaticMarkup(
      <ProfessionalSchedulingPilotControl
        teamName="Demo Campo"
        teamSlug="demo-campo"
        enabled
      />,
    );
    expect(html).toContain("Agenda profissional ativa somente neste time");
    expect(html).toContain("Desligar agenda profissional");
    expect(html).toContain('value="false"');
    expect(html).toContain("confirmações, decisões e fatos esportivos");
  });
});
