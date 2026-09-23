import { describe, expect, it, vi } from "vitest";
import { runCalendarWorkspacePilotHealth } from "./calendar-workspace-pilot-health.mjs";

const teamId = "11111111-1111-4111-8111-111111111111";
const row = {
  observed_at: "2026-09-22T12:00:00.000Z",
  team_open: true,
  calendar_workspace_enabled: true,
  scheduled_events: 8,
  reschedule_events: 2,
  pending_conflicts: 1,
  last_flag_change_at: "2026-09-22T11:00:00.000Z",
};

describe("sonda do calendário", () => {
  it("aceita somente o agregado esperado e não envia o ID na URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([row]), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    await expect(runCalendarWorkspacePilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret",
      teamId,
      expectEnabled: true,
      fetchImpl,
    })).resolves.toMatchObject({ scheduled_events: 8, pending_conflicts: 1 });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.supabase.co/rest/v1/rpc/get_calendar_workspace_health"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("falha fechado para UUID, coorte, estado e contrato inválidos", async () => {
    await expect(runCalendarWorkspacePilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret",
      teamId: "inválido",
    })).rejects.toThrow("UUID canônico");

    for (const payload of [
      [],
      [{ ...row, team_open: false }],
      [{ ...row, calendar_workspace_enabled: false }],
      [{ ...row, pending_conflicts: -1 }],
    ]) {
      const fetchImpl = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
      await expect(runCalendarWorkspacePilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret",
        teamId,
        expectEnabled: true,
        fetchImpl,
      })).rejects.toThrow();
    }
  });
});
