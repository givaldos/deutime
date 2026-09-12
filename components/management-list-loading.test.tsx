import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManagementListLoading } from "./management-list-loading";

describe("carregamento das listas de gestão", () => {
  it.each(["jogos", "campeonatos"] as const)("nomeia a estrutura de %s sem anunciar zero", (resource) => {
    const html = renderToStaticMarkup(<ManagementListLoading resource={resource} />);

    expect(html).toContain(`aria-label="Carregando ${resource}"`);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(`aria-label="Lista de ${resource}"`);
    expect(html).toContain(`Carregando ${resource}...`);
    expect(html).not.toMatch(/0 (jogo|campeonato)/);
  });
});
