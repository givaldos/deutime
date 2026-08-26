import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/app/app/[teamSlug]/settings/event-share-pilot-actions",
  () => ({
    setEventSharePilotState: vi.fn(),
  }),
);

import { EventSharePilotControl } from "./event-share-pilot-control";

describe("controle visual do piloto do cartão público", () => {
  it("expõe confirmação explícita antes da ativação", () => {
    const html = renderToStaticMarkup(
      <EventSharePilotControl
        teamName="Demo Campo"
        teamSlug="demo-campo"
        enabled={false}
      />,
    );

    expect(html).toContain("Cartão atual preservado");
    expect(html).toContain("Ativar somente neste time");
    expect(html).toContain('name="confirmation"');
    expect(html).toContain("required");
    expect(html).not.toContain("EVENT_SHARE_PILOT_TEAM_ID");
  });

  it("oferece rollback pela mesma superfície quando o piloto está ativo", () => {
    const html = renderToStaticMarkup(
      <EventSharePilotControl
        teamName="Demo Campo"
        teamSlug="demo-campo"
        enabled
      />,
    );

    expect(html).toContain("Cartão atualizado ativo");
    expect(html).toContain("Desligar compartilhamento");
    expect(html).toContain('value="false"');
  });
});
