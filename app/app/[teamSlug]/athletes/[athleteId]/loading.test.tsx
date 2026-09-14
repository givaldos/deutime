import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AthleteDetailLoading from "./loading";

describe("carregamento do detalhe do atleta", () => {
  it("anuncia uma única região ocupada e mantém o esqueleto decorativo", () => {
    const html = renderToStaticMarkup(<AthleteDetailLoading />);

    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Carregando detalhes do atleta...");
    expect(html).toContain("Detalhes do atleta</h1>");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("min-\[360px\]:flex-row");
  });
});
