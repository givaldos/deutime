import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ChampionshipLoading from "./loading";

describe("carregamento do acompanhamento de campeonato", () => {
  it("anuncia uma vez e mantém esqueletos decorativos sem movimento obrigatório", () => {
    const html = renderToStaticMarkup(<ChampionshipLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Carregando campeonato");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("motion-reduce:animate-none");
  });
});
