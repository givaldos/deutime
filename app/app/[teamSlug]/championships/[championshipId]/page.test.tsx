import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  summaryMode: "enhanced" as "enhanced" | "unavailable" | "error",
  status: "active" as "draft" | "active",
  getWorkspace: vi.fn(async () => null),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "user-a" })) }));
vi.mock("@/lib/data/championships", () => ({ getChampionshipWorkspace: mocks.getWorkspace }));
vi.mock("@/lib/data/championship-followup", () => ({
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
vi.mock("@/components/championship-public-controls", () => ({ ChampionshipPublicControls: () => null }));
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
    : { role: "owner" };
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
  mocks.getWorkspace.mockClear();
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

  it("mantém seções futuras na tela atual até suas próprias fatias", async () => {
    await expect(ChampionshipPage(props({ section: "matches" }))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getWorkspace).toHaveBeenCalledOnce();
  });
});
