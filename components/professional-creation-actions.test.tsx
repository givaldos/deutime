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

  it("explica as sete etapas e torna a primeira corrente", () => {
    const html = renderToStaticMarkup(<ChampionshipCreationProgress />);

    for (const label of [
      "Identidade",
      "Equipes",
      "Formato",
      "Regras",
      "Calendário",
      "Revisão",
      "Publicação",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("seu progresso fica salvo");
  });

  it("retoma uma etapa persistida e identifica as anteriores como concluídas", () => {
    const html = renderToStaticMarkup(
      <ChampionshipCreationProgress currentStep={6} />,
    );

    expect(html).toContain("Etapa 6 de 7");
    expect(html).toContain("Revise os jogos");
    expect(html.match(/concluída/g)).toHaveLength(5);
    expect(html).toMatch(/aria-current="step"[^>]*>[^<]*<span[^>]*>6<\/span>Revisão/);
  });
});
