import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ChampionshipCreationProgress,
  ProfessionalCreationActions,
} from "./professional-creation-actions";

describe("entradas da agenda profissional", () => {
  it("oferece duas ações textuais grandes sem depender dos ícones", () => {
    const html = renderToStaticMarkup(
      <ProfessionalCreationActions teamSlug="campo-fc" />,
    );

    expect(html).toContain('href="/app/campo-fc/events/new"');
    expect(html).toContain('href="/app/campo-fc/championships?new=1"');
    expect(html).toContain("Novo jogo");
    expect(html).toContain("Um jogo ou uma série recorrente");
    expect(html).toContain("Novo campeonato");
    expect(html).toContain("Tabela, grupos ou mata-mata");
    expect(html.match(/min-h-28/g)).toHaveLength(2);
  });

  it("explica as cinco etapas e torna a primeira corrente", () => {
    const html = renderToStaticMarkup(<ChampionshipCreationProgress />);

    for (const label of [
      "Campeonato",
      "Regras",
      "Equipes",
      "Convocados",
      "Agenda",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Escolha o nome e o formato");
  });

  it("retoma uma etapa persistida e identifica as anteriores como concluídas", () => {
    const html = renderToStaticMarkup(
      <ChampionshipCreationProgress currentStep={5} />,
    );

    expect(html).toContain("Etapa 5 de 5");
    expect(html).toContain("Acerte a agenda e conclua");
    expect(html.match(/concluída/g)).toHaveLength(4);
    expect(html).toMatch(/aria-current="step"[^>]*>[^<]*<span[^>]*>5<\/span>Agenda/);
  });
});
