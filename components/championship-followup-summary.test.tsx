import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ChampionshipFollowupSummaryError,
  ChampionshipFollowupSummaryView,
} from "./championship-followup-summary";

const summary = {
  championship: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Copa do Campo",
    format: "league" as const,
    status: "active" as const,
    status_label: "Em andamento",
    public_mode: "private" as const,
  },
  phase: {
    kind: "league" as const,
    label: "Rodada 3",
    stage: "league" as const,
    group_number: null,
    round_number: 3,
  },
  progress: {
    completed_matches: 6,
    planned_matches: 12,
    scheduled_matches: 3,
    unscheduled_matches: 3,
  },
  next_games: [{
    fixture_id: "33333333-3333-4333-8333-333333333333",
    match_id: "44444444-4444-4444-8444-444444444444",
    event_id: "55555555-5555-4555-8555-555555555555",
    event_title: "Noite de quarta",
    starts_at: "2026-09-23T22:00:00Z",
    stage: "league" as const,
    group_number: null,
    round_number: 3,
    side_a: "Verdes",
    side_b: "Azuis",
  }],
  next_action: {
    kind: "view_next_match" as const,
    label: "Ver próximo jogo",
    allowed: true,
  },
  active_participants: 8,
  regulation_version_number: 2,
};

describe("resumo do acompanhamento de campeonato", () => {
  it("mostra cabeçalho, navegação responsiva, progresso, ação e próximo jogo", () => {
    const html = renderToStaticMarkup(
      <ChampionshipFollowupSummaryView
        teamSlug="campo-fc"
        timeZone="America/Sao_Paulo"
        returnTo="/app/campo-fc/championships?status=active"
        summary={summary}
      />,
    );

    expect(html).toContain("Copa do Campo");
    expect(html).toContain("Pontos corridos");
    expect(html).toContain("Seção do campeonato: Resumo");
    for (const label of ["Resumo", "Jogos", "Classificação", "Equipes", "Regulamento"]) {
      expect(html).toContain(label);
    }
    expect(html.match(/aria-current="page"/g)).toHaveLength(2);
    expect(html).toContain("Rodada 3");
    expect(html).toContain("50%");
    expect(html).toContain("6 de 12 jogos concluídos");
    expect(html).toContain("Ver próximo jogo");
    expect(html).toContain("Verdes × Azuis");
    expect(html).toContain("23 de set. de 2026, 19:00");
    expect(html).toContain("/app/campo-fc/events/55555555-5555-4555-8555-555555555555/matches");
    expect(html).toContain("returnTo=%2Fapp%2Fcampo-fc%2Fchampionships%3Fstatus%3Dactive");
  });

  it("não oferece ação proibida ao manager", () => {
    const html = renderToStaticMarkup(
      <ChampionshipFollowupSummaryView
        teamSlug="campo-fc"
        timeZone="America/Sao_Paulo"
        returnTo={null}
        summary={{
          ...summary,
          next_games: [],
          next_action: {
            kind: "build_knockout",
            label: "Montar mata-mata",
            allowed: false,
          },
        }}
      />,
    );

    expect(html).toContain("Owner ou admin pode concluir esta etapa.");
    expect(html).not.toContain(">Montar mata-mata<svg");
    expect(html).toContain("Há jogos a agendar.");
  });

  it("diferencia campeonato encerrado de agenda vazia", () => {
    const html = renderToStaticMarkup(
      <ChampionshipFollowupSummaryView
        teamSlug="campo-fc"
        timeZone="America/Sao_Paulo"
        returnTo={null}
        summary={{
          ...summary,
          championship: { ...summary.championship, status: "completed", status_label: "Encerrado" },
          progress: {
            completed_matches: 12,
            planned_matches: 12,
            scheduled_matches: 0,
            unscheduled_matches: 0,
          },
          next_games: [],
          next_action: { kind: "completed", label: "Campeonato encerrado", allowed: false },
        }}
      />,
    );

    expect(html).toContain("Todos os jogos foram encerrados.");
    expect(html).toContain("100%");
  });

  it("mantém cabeçalho e navegação quando o resumo falha", () => {
    const html = renderToStaticMarkup(
      <ChampionshipFollowupSummaryError
        teamSlug="campo-fc"
        returnTo={null}
        championship={summary.championship}
      />,
    );

    expect(html).toContain("Copa do Campo");
    expect(html).toContain("Seção do campeonato: Resumo");
    expect(html).toContain("Não foi possível carregar o resumo");
    expect(html).toContain("Tentar novamente");
  });
});
