import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  managementMode: "enhanced" as "enhanced" | "unavailable" | "error",
  empty: false,
}));

const athleteId = "22222222-2222-4222-8222-222222222222";
const nextCursor = { sort_name: "joao", id: athleteId };
const enhancedPage = {
  items: [{
    id: athleteId,
    registration_number: 42,
    claimed: true,
    display_name: "João Jota",
    full_name: "João da Silva",
    shirt_number: 10,
    status: "active" as const,
    positions: [{ sport_format: "society" as const, code: "ALA", label: "Ala", priority: 1 }],
    photo_source: "player_profile" as const,
    photo_url: "https://storage.test/avatar-assinado.webp",
    allowed_actions: { can_review: false, can_edit: true, can_remove: true },
  }],
  filteredCount: 222,
  pendingCount: 3,
  nextCursor,
  positions: [{ code: "ALA", label: "Ala" }],
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "user-a" })) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/app/app/[teamSlug]/athletes/actions", () => ({
  reviewAthlete: vi.fn(),
  setAthleteAvailability: vi.fn(),
  removeAthlete: vi.fn(),
}));
vi.mock("@/lib/data/management-athletes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/management-athletes")>();
  return {
    ...actual,
    getManagementAthletePage: vi.fn(async () => state.managementMode === "enhanced"
      ? {
          mode: "enhanced",
          page: state.empty
            ? { ...enhancedPage, items: [], filteredCount: 0, nextCursor: null }
            : enhancedPage,
        }
      : { mode: state.managementMode }),
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: (table: string) => createQuery(table) })),
}));

import AthletesPage from "./page";

function createQuery(table: string) {
  const result = () => {
    if (table === "teams") return { data: { id: "team-a", name: "Campo FC", slug: "campo-fc", default_sport_format: "society" }, error: null };
    if (table === "team_memberships") return { data: { role: "owner" }, error: null };
    if (table === "athletes") return { data: [{
      id: athleteId,
      user_id: null,
      registration_number: 42,
      full_name: "Atleta legado",
      preferred_name: null,
      shirt_number: 7,
      status: "active",
      registration_source: "admin",
      created_at: "2026-09-01T00:00:00Z",
      removed_at: null,
    }], error: null };
    if (table === "athlete_private") return { data: [], error: null };
    if (table === "athlete_position_preferences") return { data: [], error: null };
    return { data: null, error: null };
  };
  const query: Record<string, unknown> = {};
  query.select = () => query;
  query.eq = () => query;
  query.in = () => query;
  query.order = () => query;
  query.maybeSingle = async () => result();
  query.then = (onFulfilled: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(onFulfilled);
  return query;
}

function props(searchParams: Record<string, string | string[]> = {}) {
  return {
    params: Promise.resolve({ teamSlug: "campo-fc" }),
    searchParams: Promise.resolve(searchParams),
  };
}

beforeEach(() => {
  state.managementMode = "enhanced";
  state.empty = false;
});

describe("elenco reconhecível", () => {
  it("mostra busca, situações, total, duas apresentações e paginação", async () => {
    const html = renderToStaticMarkup(await AthletesPage(props({ q: "João" })));

    expect(html).toContain("Encontrar atleta");
    expect(html).toContain("Aguardando aprovação");
    expect(html).toContain("Não aprovados");
    expect(html).toContain("222 atletas");
    expect(html).toContain("3 vínculos aguardam aprovação");
    expect(html).toContain("Lista");
    expect(html).toContain("Cartões");
    expect(html).toContain("João Jota");
    expect(html).toContain("Foto de João Jota");
    expect(html).toContain("Próxima página");
    expect(html).not.toContain("photo_path");
  });

  it("mantém a página anterior quando a capacidade está desligada", async () => {
    state.managementMode = "unavailable";
    const html = renderToStaticMarkup(await AthletesPage(props()));

    expect(html).toContain("Disponibilidade");
    expect(html).toContain("Atleta legado");
    expect(html).not.toContain("Encontrar atleta");
  });

  it("explica filtro adulterado sem consultar uma página ambígua", async () => {
    const html = renderToStaticMarkup(await AthletesPage(props({ status: ["active", "inactive"] })));
    expect(html).toContain("Não foi possível carregar");
    expect(html).toContain("mais de uma vez");
  });

  it("diferencia o vazio filtrado e oferece limpar filtros", async () => {
    state.empty = true;
    const html = renderToStaticMarkup(await AthletesPage(props({ q: "Ninguém" })));
    expect(html).toContain("Nenhum atleta com estes filtros");
    expect(html).toContain("Limpar filtros");
    expect(html).not.toContain("Cadastrar primeiro atleta");
  });

  it("preserva filtros válidos ao tentar novamente após erro", async () => {
    state.managementMode = "error";
    const html = renderToStaticMarkup(await AthletesPage(props({ status: "inactive", position: "ALA" })));
    expect(html).toContain("Não foi possível carregar");
    expect(html).toContain("status=inactive&amp;position=ALA");
  });
});
