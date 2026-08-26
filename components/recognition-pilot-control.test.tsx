import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/app/app/[teamSlug]/settings/recognition-pilot-actions",
  () => ({
    setRecognitionPilotState: vi.fn(),
    prepareRecognitionPilotAthlete: vi.fn(),
  }),
);

import { RecognitionPilotControl } from "./recognition-pilot-control";

describe("controle visual do piloto de reconhecimentos", () => {
  it("exige confirmação explícita antes de ativar a coorte", () => {
    const html = renderToStaticMarkup(
      <RecognitionPilotControl
        teamName="R10 Demo Reconhecimentos"
        teamSlug="r10-demo-reconhecimentos"
        enabled={false}
      />,
    );
    expect(html).toContain("Visão privada preservada");
    expect(html).toContain("Ativar somente neste time");
    expect(html).toContain('name="confirmation"');
    expect(html).toContain("required");
    expect(html).toContain("não geram pontos ou ranking");
  });

  it("oferece rollback preservando os fatos quando ativo", () => {
    const html = renderToStaticMarkup(
      <RecognitionPilotControl
        teamName="R10 Demo Reconhecimentos"
        teamSlug="r10-demo-reconhecimentos"
        enabled
      />,
    );
    expect(html).toContain("Reconhecimentos privados ativos neste time");
    expect(html).toContain("Desligar reconhecimentos");
    expect(html).toContain('value="false"');
    expect(html).toContain("preservação dos fatos");
    expect(html).toContain("Preparar atleta sintético");
    expect(html).toContain("Publicar resumo sintético");
    expect(html).toContain("Revogar resumo sintético");
    expect(html).toContain('name="publicConsent"');
    expect(html).toContain("exclusivamente sintéticos");
  });
});
