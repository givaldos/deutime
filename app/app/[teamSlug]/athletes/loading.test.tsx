import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AthletesLoading from "./loading";

describe("carregamento do elenco", () => {
  it("anuncia o carregamento sem expor um vazio falso", () => {
    const html = renderToStaticMarkup(<AthletesLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Carregando atletas...");
    expect(html).toContain('aria-label="Lista de atletas"');
    expect(html).not.toContain("Nenhum atleta");
  });
});
