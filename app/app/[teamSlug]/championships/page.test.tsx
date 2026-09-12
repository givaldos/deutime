import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: "owner" as "owner" | "admin" | "manager",
  managementMode: "enhanced" as "enhanced" | "unavailable" | "error",
  professionalSchedulingEnabled: false,
  empty: false,
}));

const championshipId = "22222222-2222-4222-8222-222222222222";
const statuses = ["draft", "published", "active", "completed", "archived"] as const;
const formats = ["league", "groups_knockout", "knockout"] as const;
const enhancedPage = {
  items: statuses.map((status, index) => ({
    id: `${index + 2}2222222-2222-4222-8222-222222222222`,
    name: `Copa ${index + 1}`,
    format: formats[index % formats.length],
    status,
    status_label: ["Configuração em andamento", "A começar", "Em andamento", "Encerrado", "Arquivado"][index],
    active_participants: 8,
    completed_fixtures: index,
    total_fixtures: 7,
    next_action: status === "draft" ? "Continuar configuração" : "Abrir campeonato",
    created_at: "2026-02-01T12:00:00+00:00",
  })),
  filtered_count: 35,
  next_cursor: { sort_at: "2026-02-01T12:00:00+00:00", id: championshipId },
  effective_filters: {},
};

vi.mock("server-only", () => ({}));
vi.mock("@/components/championship-forms", () => ({
  CreateChampionshipForm: () => <div>Formulário de campeonato</div>,
}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "user-a" })) }));
vi.mock("@/lib/features/professional-scheduling/server", () => ({
  isProfessionalSchedulingEnabled: vi.fn(async () => state.professionalSchedulingEnabled),
}));
vi.mock("@/lib/data/internal-squads", () => ({ getInternalSquadConfiguration: vi.fn(async () => null) }));
vi.mock("@/lib/data/championships", () => ({
  getChampionships: vi.fn(async () => [{
    id: championshipId,
    name: "Campeonato legado",
    format: "league",
    status: "active",
    public_mode: "private",
    updated_at: "2026-09-01T12:00:00Z",
    published_at: "2026-08-01T12:00:00Z",
  }]),
}));
vi.mock("@/lib/data/management-championships", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/management-championships")>();
  return {
    ...actual,
    getManagementChampionshipPage: vi.fn(async () => state.managementMode === "enhanced"
      ? { mode: "enhanced", page: state.empty ? { ...enhancedPage, items: [], filtered_count: 0, next_cursor: null } : enhancedPage }
      : { mode: state.managementMode }),
  };
});
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: (table: string) => createQuery(table) })),
}));

import ChampionshipsPage from "./page";

function createQuery(table: string) {
  const result = () => table === "teams"
    ? { data: { id: "team-a", name: "Campo FC", slug: "campo-fc", timezone: "America/Sao_Paulo" }, error: null }
    : { data: { role: state.role }, error: null };
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => result(),
  };
  return query;
}

function props(searchParams: Record<string, string | string[]> = {}) {
  return {
    params: Promise.resolve({ teamSlug: "campo-fc" }),
    searchParams: Promise.resolve(searchParams),
  };
}

beforeEach(() => {
  state.role = "owner";
  state.managementMode = "enhanced";
  state.professionalSchedulingEnabled = false;
  state.empty = false;
});

describe("lista de campeonatos", () => {
  it("mostra cinco estados, três formatos, total, próxima ação e paginação", async () => {
    const html = renderToStaticMarkup(await ChampionshipsPage(props({ status: "active", q: "Copa" })));

    expect(html).toContain("Encontrar campeonatos");
    for (const label of ["Configuração em andamento", "A começar", "Em andamento", "Encerrado", "Arquivado"]) expect(html).toContain(label);
    for (const label of ["Pontos corridos", "Grupos + mata-mata", "Mata-mata"]) expect(html).toContain(label);
    expect(html).toContain("35 campeonatos");
    expect(html).toContain("Continuar configuração");
    expect(html).toContain("Próxima página");
    expect(html).toContain("returnTo=%2Fapp%2Fcampo-fc%2Fchampionships%3Fstatus%3Dactive%26q%3DCopa");
  });

  it("permite ao manager encontrar e operar sem oferecer criação", async () => {
    state.role = "manager";
    const html = renderToStaticMarkup(await ChampionshipsPage(props()));

    expect(html).toContain("Você pode operar os confrontos já publicados");
    expect(html).toContain("Copa 1");
    expect(html).not.toContain("Novo campeonato");
    expect(html).not.toContain("Formulário de campeonato");
  });

  it("mantém a lista anterior quando o contrato está indisponível", async () => {
    state.managementMode = "unavailable";
    const html = renderToStaticMarkup(await ChampionshipsPage(props()));

    expect(html).toContain("Competições");
    expect(html).toContain("Campeonato legado");
    expect(html).not.toContain("Encontrar campeonatos");
  });

  it("explica parâmetros ambíguos em vez de parecer uma lista vazia", async () => {
    const html = renderToStaticMarkup(await ChampionshipsPage(props({ status: ["draft", "active"] })));

    expect(html).toContain("Não foi possível carregar");
    expect(html).toContain("mais de uma vez");
  });

  it("diferencia o vazio filtrado por período sem abrir a criação", async () => {
    state.empty = true;
    const html = renderToStaticMarkup(await ChampionshipsPage(props({ from: "2026-09-01", to: "2026-09-30" })));

    expect(html).toContain("Nenhum resultado com estes filtros");
    expect(html).toContain("Limpar filtros");
    expect(html).not.toContain('<details class="app-surface group p-5 sm:p-7" open=""');
  });

  it("preserva filtros válidos ao tentar novamente após erro", async () => {
    state.managementMode = "error";
    const html = renderToStaticMarkup(await ChampionshipsPage(props({ q: "Copa", format: "league" })));

    expect(html).toContain("Não foi possível carregar");
    expect(html).toContain('href="/app/campo-fc/championships?q=Copa&amp;format=league"');
  });
});
