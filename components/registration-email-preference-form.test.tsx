import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/settings/actions", () => ({
  updateRegistrationEmailPreference: vi.fn(),
}));

import { RegistrationEmailPreferenceForm } from "./registration-email-preference-form";

describe("preferência do aviso de cadastro", () => {
  beforeEach(() => vi.clearAllMocks());

  it("explica escopo individual, privacidade e preservação dos alertas de segurança", () => {
    const html = renderToStaticMarkup(
      <RegistrationEmailPreferenceForm
        teamId="11111111-1111-4111-8111-111111111111"
        teamSlug="avisos-fc"
        enabled
      />,
    );
    expect(html).toContain("Novos pedidos de entrada");
    expect(html).toContain("sem dados pessoais");
    expect(html).toContain("vale apenas para você e para este time");
    expect(html).toContain("Alertas obrigatórios de segurança não são alterados");
    expect(html).toContain("checked");
  });
});
