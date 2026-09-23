import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import { getManagementCalendar } from "./management-calendar";

const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
vi.spyOn(console, "warn").mockImplementation(() => undefined);

const teamId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const validCalendar = {
  period: { start: "2026-08-31", end: "2026-10-11", time_zone: "America/Sao_Paulo" },
  items: [{
    id: eventId,
    title: "Final regional",
    kind: "championship",
    sport_format: "society",
    starts_at: "2026-09-22T22:00:00Z",
    ends_at: "2026-09-22T23:30:00Z",
    professional_schedule_state: "pending_review",
    venue_name: "Arena Central",
    championships: [],
    internal_teams: [],
    pending_conflict_count: 1,
    highest_severity: "hard",
  }],
  truncated: false,
  reschedule_items: [],
  summary: { scheduled_count: 1, reschedule_count: 0, conflict_count: 1 },
};

describe("fronteira de dados do calendário", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delega período e filtros para uma projeção estreita", async () => {
    mocks.rpc.mockResolvedValue({ data: validCalendar, error: null });
    await expect(getManagementCalendar({
      mode: "month",
      teamId,
      start: "2026-08-31",
      end: "2026-10-11",
      search: "Final regional",
      kind: "championship",
      internalTeamId: null,
      championshipId: null,
    })).resolves.toEqual({ mode: "calendar", calendar: validCalendar });
    expect(mocks.rpc).toHaveBeenCalledWith("get_management_calendar", {
      requested_team_id: teamId,
      requested_start: "2026-08-31",
      requested_end: "2026-10-11",
      requested_search: "Final regional",
      requested_kind: "championship",
      requested_internal_team_id: undefined,
      requested_championship_id: undefined,
    });
    expect(infoSpy).toHaveBeenCalledWith(
      "[calendar-workspace] calendar_read",
      expect.objectContaining({ view: "month", fallback: false, item_count: 1 }),
    );
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(teamId);
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain("Final regional");
  });

  it.each(["P0001", "42883", "PGRST202"])("mantém fallback para %s", async (code) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(getManagementCalendar({
      mode: "week", teamId, start: "2026-09-21", end: "2026-09-27", search: null, kind: null,
      internalTeamId: null, championshipId: null,
    })).resolves.toEqual({ mode: "unavailable" });
  });

  it("rejeita resposta ampla ou inválida", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...validCalendar, athlete_names: ["Pessoa"] }, error: null });
    await expect(getManagementCalendar({
      mode: "week", teamId, start: "2026-09-21", end: "2026-09-27", search: null, kind: null,
      internalTeamId: null, championshipId: null,
    })).resolves.toEqual({ mode: "error" });

    mocks.rpc.mockResolvedValue({ data: { items: [] }, error: null });
    await expect(getManagementCalendar({
      mode: "week", teamId, start: "2026-09-21", end: "2026-09-27", search: null, kind: null,
      internalTeamId: null, championshipId: null,
    })).resolves.toEqual({ mode: "error" });
  });
});
