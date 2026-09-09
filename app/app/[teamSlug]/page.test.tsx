import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  membership: { role: "owner" } as { role: "owner" | "admin" | "manager" } | null,
  pendingAthleteCount: 0,
  eventCount: 0,
  nextEvent: null as null | {
    id: string;
    title: string;
    starts_at: string;
    sport_format: "field" | "society" | "futsal";
  },
  recentAthletes: [] as unknown[],
  recentEvents: [] as unknown[],
  recentResults: [] as Array<{ id: string; title: string; starts_at: string }>,
  attendance: [] as Array<{ status: "confirmed" | "pending" | "declined" }>,
  professionalSchedulingEnabled: false,
  championships: [] as Array<{
    id: string;
    name: string;
    status: "draft" | "published" | "active" | "completed" | "archived";
  }> | null,
}));

vi.mock("@/lib/auth/dal", () => ({
  requireUser: vi.fn(async () => ({ id: "user-a" })),
}));

vi.mock("@/lib/data/championships", () => ({
  getChampionships: vi.fn(async () => state.championships),
}));

vi.mock("@/lib/data/internal-squads", () => ({
  getInternalSquadConfiguration: vi.fn(async () => null),
}));

vi.mock("@/lib/env/server", () => ({
  getAppUrl: () => "https://deutime.app",
}));

vi.mock("@/lib/features/professional-scheduling/server", () => ({
  isProfessionalSchedulingEnabled: vi.fn(
    async () => state.professionalSchedulingEnabled,
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => createQuery(table),
  })),
}));

import TeamDashboardPage from "./page";

function createQuery(table: string) {
  const filters = new Map<string, unknown>();
  let head = false;
  const result = () => {
    if (table === "teams") {
      return { data: { id: "team-a", name: "Campo FC", slug: "campo-fc", timezone: "America/Sao_Paulo" }, error: null };
    }
    if (table === "team_memberships") return { data: state.membership, error: null };
    if (table === "athletes" && head) {
      return { data: null, count: state.pendingAthleteCount, error: null };
    }
    if (table === "athletes") return { data: state.recentAthletes, error: null };
    if (table === "event_attendance") return { data: state.attendance, error: null };
    if (table === "events" && head) return { data: null, count: state.eventCount, error: null };
    if (table === "events" && filters.get("status") === "scheduled") {
      return { data: state.nextEvent, error: null };
    }
    if (table === "events" && filters.get("status") === "completed") {
      return { data: state.recentResults, error: null };
    }
    if (table === "events") return { data: state.recentEvents, error: null };
    return { data: null, error: null };
  };
  const query = {
    select: (_columns: string, options?: { head?: boolean }) => {
      head = options?.head === true;
      return query;
    },
    eq: (column: string, value: unknown) => {
      filters.set(column, value);
      return query;
    },
    is: () => query,
    gte: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => result(),
    then: (
      onFulfilled: (value: ReturnType<typeof result>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result()).then(onFulfilled, onRejected),
  };
  return query;
}

function props() {
  return {
    params: Promise.resolve({ teamSlug: "campo-fc" }),
    searchParams: Promise.resolve({}),
  };
}

beforeEach(() => {
  state.membership = { role: "owner" };
  state.pendingAthleteCount = 0;
  state.eventCount = 0;
  state.nextEvent = null;
  state.recentAthletes = [];
  state.recentEvents = [];
  state.recentResults = [];
  state.attendance = [];
  state.professionalSchedulingEnabled = false;
  state.championships = [];
});

describe("início do time", () => {
  it("orienta um time vazio sem inventar dados", async () => {
    const html = renderToStaticMarkup(await TeamDashboardPage(props()));

    expect(html).toContain("Nenhum jogo marcado");
    expect(html).toContain("Nenhum campeonato criado");
    expect(html).toContain("Nenhum jogo encerrado ainda");
    expect(html).toContain("Novo jogo");
    expect(html).toContain("Novo campeonato");
  });

  it("prioriza pendência, próximo jogo, campeonato e resultados nesta ordem", async () => {
    state.pendingAthleteCount = 2;
    state.eventCount = 3;
    state.nextEvent = {
      id: "event-next",
      title: "Jogo de quinta",
      starts_at: "2026-09-10T22:00:00.000Z",
      sport_format: "society",
    };
    state.attendance = [{ status: "confirmed" }, { status: "pending" }];
    state.championships = [
      { id: "cup-a", name: "Copa da Firma", status: "active" },
    ];
    state.recentResults = [
      { id: "event-old", title: "Final de agosto", starts_at: "2026-08-28T22:00:00.000Z" },
    ];

    const html = renderToStaticMarkup(await TeamDashboardPage(props()));
    const pendingIndex = html.indexOf("Precisa da sua atenção");
    const nextIndex = html.indexOf("Próximo jogo", pendingIndex);
    const championshipIndex = html.indexOf("Campeonatos", nextIndex);
    const resultIndex = html.indexOf("Últimos resultados", championshipIndex);

    expect(pendingIndex).toBeGreaterThan(-1);
    expect(nextIndex).toBeGreaterThan(pendingIndex);
    expect(championshipIndex).toBeGreaterThan(nextIndex);
    expect(resultIndex).toBeGreaterThan(championshipIndex);
    expect(html).toContain("Revisar cadastros");
    expect(html).toContain("Ver jogo");
    expect(html).toContain("Copa da Firma");
    expect(html).toContain("Final de agosto");
    expect(html).toContain("Ver todos os jogos");
  });

  it("não oferece Novo campeonato ao manager", async () => {
    state.membership = { role: "manager" };
    state.professionalSchedulingEnabled = true;

    const html = renderToStaticMarkup(await TeamDashboardPage(props()));

    expect(html).toContain("Ver campeonatos");
    expect(html).toContain("Novo jogo");
    expect(html).not.toContain("Novo campeonato");
    expect(html).not.toContain("Equipes padrão definidas");
  });

  it("nega o painel quando o vínculo foi removido", async () => {
    state.membership = null;

    await expect(TeamDashboardPage(props())).rejects.toThrow("NEXT_REDIRECT:/me");
  });
});
