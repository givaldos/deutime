import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  managementMode: "enhanced" as "enhanced" | "unavailable" | "error",
  professionalSchedulingEnabled: false,
}));

const eventId = "22222222-2222-4222-8222-222222222222";
const nextCursor = {
  rank: 0,
  sort_at: "2026-09-12T22:00:00+00:00",
  id: eventId,
};
const enhancedPage = {
  list: {
    items: [{
      id: eventId,
      title: "Final regional",
      kind: "championship" as const,
      sport_format: "society" as const,
      starts_at: "2026-09-12T22:00:00+00:00",
      ends_at: "2026-09-12T23:00:00+00:00",
      status: "scheduled" as const,
      professional_schedule_state: "scheduled" as const,
      venue_name: "Arena Central",
      confirmed_count: 12,
      attendance_count: 16,
      match_count: 1,
      championships: [],
      internal_teams: [],
      reschedule_reason: null,
      next_action: "Abrir jogo",
    }],
    filtered_count: 201,
    next_cursor: nextCursor,
    effective_filters: {},
  },
  filter_options: { internal_teams: [], championships: [] },
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "user-a" })) }));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: vi.fn(async () => state.professionalSchedulingEnabled),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/lib/data/management-events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/management-events")>();
  return {
    ...actual,
    getManagementEventPage: vi.fn(async () => state.managementMode === "enhanced"
      ? { mode: "enhanced", page: enhancedPage }
      : { mode: state.managementMode }),
    getLegacyManagementEventPage: vi.fn(async () => ({
      events: [{
        id: eventId,
        title: "Jogo legado",
        kind: "friendly",
        organization_mode: "manual",
        sport_format: "society",
        starts_at: "2099-09-12T22:00:00+00:00",
        ends_at: "2099-09-12T23:00:00+00:00",
        status: "scheduled",
        professional_schedule_state: "scheduled",
        opponent_name: "Visitante",
        venue_id: null,
      }],
      attendanceByEvent: new Map([[eventId, { total: 10, confirmed: 7 }]]),
      venueById: new Map(),
    })),
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: (table: string) => createQuery(table) })),
}));

import EventsPage from "./page";

function createQuery(table: string) {
  const result = () => {
    if (table === "teams") return { data: { id: "team-a", name: "Campo FC", slug: "campo-fc", timezone: "America/Sao_Paulo" }, error: null };
    if (table === "team_memberships") return { data: { role: "owner" }, error: null };
    if (table === "event_schedule_conflicts") return { data: null, count: 2, error: null };
    return { data: null, error: null };
  };
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => result(),
    then: (onFulfilled: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(onFulfilled),
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
  state.managementMode = "enhanced";
  state.professionalSchedulingEnabled = false;
});

describe("lista de jogos", () => {
  it("entrega busca, visões, total real, paginação e retorno ao contexto", async () => {
    const html = renderToStaticMarkup(await EventsPage(props({ q: "Final regional" })));

    expect(html).toContain("Encontrar jogos");
    expect(html).toContain("A reagendar");
    expect(html).toContain("Encerrados");
    expect(html).toContain("201 jogos");
    expect(html).toContain("Próxima página");
    expect(html).toContain("Final regional");
    expect(html).toContain("returnTo=%2Fapp%2Fcampo-fc%2Fevents%3Fq%3DFinal%2Bregional");
  });

  it("mantém a agenda anterior quando a projeção está inativa", async () => {
    state.managementMode = "unavailable";
    const html = renderToStaticMarkup(await EventsPage(props()));

    expect(html).toContain("Agenda");
    expect(html).toContain("Próximos jogos");
    expect(html).toContain("Jogo legado");
    expect(html).not.toContain("Encontrar jogos");
  });

  it("explica o filtro inválido sem consultar uma página ambígua", async () => {
    const html = renderToStaticMarkup(await EventsPage(props({ view: ["upcoming", "completed"] })));

    expect(html).toContain("Não foi possível carregar");
    expect(html).toContain("mais de uma vez");
  });

  it("mostra as pendências profissionais somente quando habilitadas", async () => {
    state.professionalSchedulingEnabled = true;
    const html = renderToStaticMarkup(await EventsPage(props()));

    expect(html).toContain("Pendências e decisões da agenda");
    expect(html).toContain(">2<");
  });
});
