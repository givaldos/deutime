import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  summaryMode: "enhanced" as "enhanced" | "unavailable" | "error",
  status: "active" as "draft" | "active",
  role: "owner" as "owner" | "admin" | "manager",
  getWorkspace: vi.fn(async () => null),
  getFixturePage: vi.fn(async () => ({ mode: "enhanced", data: { items: [], filtered_count: 0, next_cursor: null, effective_filters: {} } })),
  getStandings: vi.fn(async () => ({ mode: "enhanced", data: [] })),
  getParticipants: vi.fn(async () => ({ mode: "enhanced", data: [] })),
  getRegulation: vi.fn(async () => ({
    mode: "enhanced",
    data: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Copa do Campo",
      format: "league",
      status: "active",
      public_id: "33333333-3333-4333-8333-333333333333",
      public_mode: "private",
      win_points: 3,
      draw_points: 1,
      loss_points: 0,
      tiebreak_order: ["wins", "goal_difference", "goals_for", "head_to_head"],
      group_count: null,
      qualifiers_per_group: null,
      current_version_number: 1,
      version_count: 1,
    },
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "user-a" })) }));
vi.mock("@/lib/data/championships", () => ({ getChampionshipWorkspace: mocks.getWorkspace }));
vi.mock("@/lib/data/championship-followup", () => ({
  decodeChampionshipFollowupCursor: vi.fn(() => null),
  getChampionshipFollowupFixturePage: mocks.getFixturePage,
  getChampionshipFollowupStandings: mocks.getStandings,
  getChampionshipFollowupParticipants: mocks.getParticipants,
  getChampionshipFollowupRegulation: mocks.getRegulation,
  getChampionshipFollowupSummary: vi.fn(async () => mocks.summaryMode === "enhanced"
    ? {
        mode: "enhanced",
        data: {
          championship: {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Copa do Campo",
            format: "league",
            status: mocks.status,
            status_label: mocks.status === "draft" ? "Configuração em andamento" : "Em andamento",
            public_mode: "private",
          },
          phase: {
            kind: mocks.status === "draft" ? "configuration" : "league",
            label: mocks.status === "draft" ? "Configuração em andamento" : "Rodada 2",
            stage: mocks.status === "draft" ? null : "league",
            group_number: null,
            round_number: mocks.status === "draft" ? null : 2,
          },
          progress: {
            completed_matches: 2,
            planned_matches: 6,
            scheduled_matches: 2,
            unscheduled_matches: 2,
          },
          next_games: [],
          next_action: {
            kind: mocks.status === "draft" ? "continue_setup" : "schedule_matches",
            label: mocks.status === "draft" ? "Continuar configuração" : "Agendar jogos",
            allowed: true,
          },
          active_participants: 4,
          regulation_version_number: 1,
        },
      }
    : { mode: mocks.summaryMode }),
}));
vi.mock("@/lib/features/professional-scheduling/server", () => ({
  isProfessionalSchedulingEnabled: vi.fn(async () => false),
}));
vi.mock("@/lib/env/server", () => ({ getAppUrl: () => "https://deutime.app" }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: (table: string) => createQuery(table) })),
}));
vi.mock("@/components/championship-forms", () => ({
  AddParticipantForm: () => null,
  ChampionshipRegulationEditor: () => null,
  ChampionshipPublicationControls: () => null,
  GroupAdvanceControl: () => null,
  KnockoutResolutionForm: () => null,
  LinkFixtureForm: () => null,
  QualifierDecisionForm: () => null,
  ReopenChampionshipRegulationControl: () => null,
  ReleaseFixtureForm: () => null,
  WithdrawParticipantForm: () => null,
}));
vi.mock("@/components/championship-public-controls", () => ({ ChampionshipPublicControls: () => <div>Página compartilhável</div> }));
vi.mock("@/components/championship-setup-wizard", () => ({ ChampionshipSetupWizard: () => null }));
vi.mock("@/components/internal-squad-badge", () => ({ InternalSquadBadge: () => null }));

import ChampionshipPage from "./page";

function createQuery(table: string) {
  const result = table === "teams"
    ? {
        id: "team-a",
        name: "Campo FC",
        slug: "campo-fc",
        timezone: "America/Sao_Paulo",
        default_sport_format: "society",
      }
    : { role: mocks.role };
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: result, error: null }),
  };
  return query;
}

function props(searchParams: Record<string, string | string[]> = {}) {
  return {
    params: Promise.resolve({
      teamSlug: "campo-fc",
      championshipId: "22222222-2222-4222-8222-222222222222",
    }),
    searchParams: Promise.resolve(searchParams),
  };
}

beforeEach(() => {
  mocks.summaryMode = "enhanced";
  mocks.status = "active";
  mocks.role = "owner";
  mocks.getWorkspace.mockClear();
  mocks.getFixturePage.mockClear();
  mocks.getStandings.mockClear();
  mocks.getParticipants.mockClear();
  mocks.getRegulation.mockClear();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("detalhe do campeonato", () => {
  it("abre competição ativa no Resumo sem carregar o workspace legado", async () => {
    const html = renderToStaticMarkup(await ChampionshipPage(props()));

    expect(html).toContain("Copa do Campo");
    expect(html).toContain("Rodada 2");
    expect(html).toContain("Seção do campeonato: Resumo");
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });

  it("normaliza seção inválida para Resumo", async () => {
    const html = renderToStaticMarkup(await ChampionshipPage(props({ section: "segredo" })));

    expect(html).toContain("Seção do campeonato: Resumo");
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });

  it("mantém a tela atual quando o contrato está indisponível", async () => {
    mocks.summaryMode = "unavailable";

    await expect(ChampionshipPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getWorkspace).toHaveBeenCalledWith(
      "team-a",
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("mantém a configuração no assistente existente", async () => {
    mocks.status = "draft";

    await expect(ChampionshipPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getWorkspace).toHaveBeenCalledOnce();
  });

  it("carrega Jogos sem abrir o workspace legado e normaliza filtros", async () => {
    const html = renderToStaticMarkup(await ChampionshipPage(props({ section: "matches", stage: "group", group: "2", round: "3", view: "upcoming" })));
    expect(html).toContain("Jogos");
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
    expect(mocks.getFixturePage).toHaveBeenCalledWith("team-a", expect.any(String), expect.objectContaining({ stage: "group", groupNumber: 2, roundNumber: 3, view: "upcoming" }));
  });

  it("carrega o contexto administrativo somente ao selecionar um confronto visível", async () => {
    const fixtureId = "44444444-4444-4444-8444-444444444444";
    mocks.getFixturePage.mockResolvedValueOnce({ mode: "enhanced", data: { items: [{ id: fixtureId, stage: "league", group_number: null, round_number: 1, ordinal: 1, status: "scheduled", situation: "unscheduled", match_id: null, event_id: null, event_title: null, starts_at: null, side_a: "Verdes", side_b: "Azuis" }], filtered_count: 1, next_cursor: null, effective_filters: {} } } as never);
    mocks.getWorkspace.mockResolvedValueOnce({
      fixtures: [{ id: fixtureId, stage: "league", status: "scheduled", match_id: null, winner_participant_id: null }],
      participants: [],
      slots: [],
      matchById: {},
      candidateMatches: [],
    } as never);
    renderToStaticMarkup(await ChampionshipPage(props({ section: "matches", fixture: fixtureId })));
    expect(mocks.getWorkspace).toHaveBeenCalledWith("team-a", expect.any(String));
  });

  it("carrega Classificação e Equipes sem abrir o workspace legado", async () => {
    renderToStaticMarkup(await ChampionshipPage(props({ section: "standings" })));
    expect(mocks.getStandings).toHaveBeenCalled();
    renderToStaticMarkup(await ChampionshipPage(props({ section: "teams" })));
    expect(mocks.getParticipants).toHaveBeenCalled();
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });

  it("carrega Regulamento sem abrir o workspace legado", async () => {
    const html = renderToStaticMarkup(await ChampionshipPage(props({ section: "regulation" })));
    expect(html).toContain("Regra vigente");
    expect(html).toContain("Página compartilhável");
    expect(mocks.getRegulation).toHaveBeenCalledWith("team-a", expect.any(String));
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });

  it("mantém manager somente em leitura nas ações sensíveis", async () => {
    mocks.role = "manager";
    const html = renderToStaticMarkup(await ChampionshipPage(props({ section: "regulation" })));
    expect(html).toContain("Você pode consultar o regulamento");
    expect(html).not.toContain("Página compartilhável");
  });
});
