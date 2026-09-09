import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TeamMoreNavigation } from "./team-more-navigation";

describe("área Mais do time", () => {
  it("oferece todos os destinos funcionais ao owner e mantém o time na URL", () => {
    const html = renderToStaticMarkup(
      <TeamMoreNavigation teamSlug="campo-fc" role="owner" />,
    );

    for (const label of [
      "Equipes",
      "Diretoria e acessos",
      "Ajustes do time",
      "Meu perfil",
      "Meus convites",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('href="/app/campo-fc/settings#internal-teams"');
    expect(html).toContain('href="/app/campo-fc/settings#team-access"');
    expect(html).not.toContain("Em breve");
    expect(html.match(/min-h-24/g)).toHaveLength(5);
  });

  it("não oferece áreas administrativas ao manager", () => {
    const html = renderToStaticMarkup(
      <TeamMoreNavigation teamSlug="campo-fc" role="manager" />,
    );

    expect(html).toContain("Meu perfil");
    expect(html).toContain("Meus convites");
    expect(html).not.toContain("Equipes");
    expect(html).not.toContain("Diretoria e acessos");
    expect(html).not.toContain("Ajustes do time");
    expect(html).not.toContain("/app/campo-fc/settings");
  });
});
