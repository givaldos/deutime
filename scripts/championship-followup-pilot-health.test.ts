import { describe, expect, it, vi } from "vitest";
import { runChampionshipFollowupPilotHealth } from "./championship-followup-pilot-health.mjs";

const teamId = "11111111-1111-4111-8111-111111111111";
const row = {
  observed_at: "2026-09-21T12:00:00.000Z",
  team_open: true,
  clear_championship_workspace_enabled: true,
  total_championships: 3,
  followup_championships: 2,
  configuration_championships: 1,
  total_fixtures: 12,
  linked_fixtures: 8,
  last_flag_change_at: "2026-09-21T11:00:00.000Z",
};

describe("sonda do acompanhamento de campeonatos", () => {
  it("aceita somente o agregado esperado e não envia o ID na URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([row]), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    await expect(runChampionshipFollowupPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret",
      teamId,
      expectEnabled: true,
      fetchImpl,
    })).resolves.toMatchObject({ total_championships: 3, linked_fixtures: 8 });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.supabase.co/rest/v1/rpc/get_championship_followup_health"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("falha fechado para UUID, coorte, estado e contrato inválidos", async () => {
    await expect(runChampionshipFollowupPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret",
      teamId: "inválido",
    })).rejects.toThrow("UUID canônico");

    for (const payload of [[], [{ ...row, team_open: false }], [{ ...row, clear_championship_workspace_enabled: false }], [{ ...row, total_fixtures: -1 }]]) {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
      await expect(runChampionshipFollowupPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret",
        teamId,
        expectEnabled: true,
        fetchImpl,
      })).rejects.toThrow();
    }
  });
});
