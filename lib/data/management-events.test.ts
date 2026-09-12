import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const createClient = vi.fn(async () => ({ rpc }));
  return { rpc, createClient };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import {
  buildManagementEventListUrl,
  decodeManagementEventCursor,
  encodeManagementEventCursor,
  getManagementEventPage,
  parseManagementEventSearchParams,
  safeManagementEventReturnTo,
  type ManagementEventFilters,
} from "./management-events";

const teamId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const internalTeamId = "33333333-3333-4333-8333-333333333333";
const championshipId = "44444444-4444-4444-8444-444444444444";
const cursor = {
  rank: 0,
  sort_at: "2026-09-12T22:00:00+00:00",
  id: eventId,
};
const filters: ManagementEventFilters = {
  view: "upcoming",
  search: "Final regional",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  kind: "championship",
  internalTeamId,
  championshipId,
  cursor,
};
const validPage = {
  list: {
    items: [{
      id: eventId,
      title: "Final regional",
      kind: "championship",
      sport_format: "society",
      starts_at: "2026-09-12T22:00:00+00:00",
      ends_at: "2026-09-12T23:00:00+00:00",
      status: "scheduled",
      professional_schedule_state: "scheduled",
      venue_name: "Arena Central",
      confirmed_count: 12,
      attendance_count: 16,
      match_count: 1,
      championships: [{ id: championshipId, name: "Liga Regional" }],
      internal_teams: [{ id: internalTeamId, name: "Titulares", color: "#047857" }],
      reschedule_reason: null,
      next_action: "Abrir jogo",
    }],
    filtered_count: 201,
    next_cursor: cursor,
    effective_filters: { view: "upcoming" },
  },
  filter_options: {
    internal_teams: [{ id: internalTeamId, name: "Titulares", color: "#047857" }],
    championships: [{ id: championshipId, name: "Liga Regional", status: "active" }],
  },
};

describe("management events data boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normaliza a combinação de filtros e preserva um cursor estrito", () => {
    const encodedCursor = encodeManagementEventCursor(cursor);
    expect(decodeManagementEventCursor(encodedCursor)).toEqual(cursor);
    expect(parseManagementEventSearchParams({
      view: "upcoming",
      q: "  Final\u0000   regional ",
      from: "2026-09-01",
      to: "2026-09-30",
      kind: "championship",
      team: internalTeamId,
      championship: championshipId,
      cursor: encodedCursor,
    })).toEqual({ ok: true, filters });
  });

  it.each([
    [{ view: ["upcoming", "completed"] }, "mais de uma vez"],
    [{ extra: "1" }, "desconhecido"],
    [{ from: "2026-09-30", to: "2026-09-01" }, "ordem correta"],
    [{ cursor: "não-é-cursor" }, "página solicitada"],
  ])("rejeita parâmetros ambíguos ou adulterados", (query, message) => {
    expect(parseManagementEventSearchParams(query)).toMatchObject({ ok: false, message: expect.stringContaining(message) });
  });

  it("monta a URL completa sem perder filtros ou cursor", () => {
    expect(buildManagementEventListUrl("meu-time", filters, cursor)).toContain(
      "/app/meu-time/events?q=Final+regional&from=2026-09-01&to=2026-09-30&kind=championship",
    );
  });

  it("aceita somente retorno relativo para a lista do mesmo time", () => {
    const returnTo = `/app/meu-time/events?view=completed&q=final`;
    expect(safeManagementEventReturnTo("meu-time", returnTo)).toBe(returnTo);
    expect(safeManagementEventReturnTo("meu-time", "https://malicioso.example/app/meu-time/events")).toBeNull();
    expect(safeManagementEventReturnTo("meu-time", "/app/outro-time/events")).toBeNull();
    expect(safeManagementEventReturnTo("meu-time", `${returnTo}#conteudo`)).toBeNull();
    expect(safeManagementEventReturnTo("meu-time", [returnTo])).toBeNull();
  });

  it("delega todos os filtros para uma única projeção validada", async () => {
    mocks.rpc.mockResolvedValue({ data: validPage, error: null });

    await expect(getManagementEventPage(teamId, filters)).resolves.toEqual({
      mode: "enhanced",
      page: validPage,
    });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("get_management_event_page", {
      requested_team_id: teamId,
      requested_view: "upcoming",
      requested_search: "Final regional",
      requested_period_start: "2026-09-01",
      requested_period_end: "2026-09-30",
      requested_kind: "championship",
      requested_internal_team_id: internalTeamId,
      requested_championship_id: championshipId,
      requested_limit: 24,
      requested_cursor: cursor,
    });
  });

  it.each(["P0001", "42883", "PGRST202"])(
    "mantém o fallback quando a projeção está indisponível (%s)",
    async (code) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "indisponível" } });
      await expect(getManagementEventPage(teamId, filters)).resolves.toEqual({ mode: "unavailable" });
    },
  );

  it("falha de modo explícito diante de erro inesperado ou resposta inválida", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "erro" } });
    await expect(getManagementEventPage(teamId, filters)).resolves.toEqual({ mode: "error" });
    mocks.rpc.mockResolvedValueOnce({ data: { list: [] }, error: null });
    await expect(getManagementEventPage(teamId, filters)).resolves.toEqual({ mode: "error" });
  });
});
