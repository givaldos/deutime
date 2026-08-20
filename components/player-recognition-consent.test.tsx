import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/me/actions", () => ({
  updateMyRecognitionSummaryConsent: vi.fn(),
}));

import { PlayerRecognitionConsent } from "./player-recognition-consent";

const athleteId = "d1300000-0000-4000-8000-000000000001";

describe("player recognition consent", () => {
  it("explica e oferece publicação separada por time", () => {
    const html = renderToStaticMarkup(
      <PlayerRecognitionConsent
        links={[
          { athleteId, teamName: "Society United", granted: false },
        ]}
      />,
    );

    expect(html).toContain("Publicar meu resumo positivo");
    expect(html).toContain("Society United");
    expect(html).toContain("Publicar meu resumo");
    expect(html).toContain('name="athleteId"');
    expect(html).toContain('value="true"');
    expect(html).toContain("nunca partida, data, voto, colocação ou ranking");
    expect(html).toContain("não altera sua visão privada");
    expect(html).toContain("min-h-12");
  });

  it("permite revogar e anuncia a retirada imediata da fatia pública", () => {
    const html = renderToStaticMarkup(
      <PlayerRecognitionConsent
        status="revoked"
        links={[
          { athleteId, teamName: "Society United", granted: true },
        ]}
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("já não aparece no perfil público");
    expect(html).toContain("Parar de publicar o resumo");
    expect(html).toContain('value="false"');
  });

  it("não cria superfície quando nenhum time está habilitado", () => {
    expect(
      renderToStaticMarkup(<PlayerRecognitionConsent links={[]} />),
    ).toBe("");
  });
});
