import { describe, expect, it, vi } from "vitest";
import { runLineupPilotHealth } from "./lineup-pilot-health.mjs";

const teamId = "10000000-0000-4000-8000-000000000001";
const healthyPayload = {
  observed_at: "2026-08-11T12:00:00Z",
  team_division_enabled: true,
  public_event_page_enabled: true,
  scheduled_events: 2,
  draft_events: 1,
  draft_squads: 2,
  draft_assignments: 4,
  draft_exclusions: 1,
  active_revisions: 1,
  published_squads: 2,
  published_assignments: 4,
  consented_published_assignments: 2,
  publications_24h: 1,
  withdrawals_24h: 0,
  last_draft_at: "2026-08-11T11:00:00Z",
  last_publication_at: "2026-08-11T11:05:00Z",
  last_withdrawal_at: null,
};

describe("sonda operacional do piloto de divisão", () => {
  it("consulta somente a RPC agregada e normaliza contagens", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([healthyPayload]), { status: 200 }));
    await expect(runLineupPilotHealth({ supabaseUrl: "https://example.supabase.co", secretKey: "secret-test", teamId, expectEnabled: true, fetchImpl })).resolves.toEqual(healthyPayload);
    expect(fetchImpl.mock.calls[0]?.[0]).toEqual(new URL("https://example.supabase.co/rest/v1/rpc/get_event_lineup_pilot_health"));
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ requested_team_id: teamId }) });
  });

  it("falha fechado quando um gate esperado está desligado", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ ...healthyPayload, team_division_enabled: false }]), { status: 200 }));
    await expect(runLineupPilotHealth({ supabaseUrl: "https://example.supabase.co", secretKey: "secret-test", teamId, expectEnabled: true, fetchImpl })).rejects.toThrow("Piloto de divisão deveria estar ativo");
  });

  it("recusa coorte inválida antes da requisição", async () => {
    const fetchImpl = vi.fn();
    await expect(runLineupPilotHealth({ supabaseUrl: "https://example.supabase.co", secretKey: "secret-test", teamId: "../outro-time", fetchImpl })).rejects.toThrow("LINEUP_PILOT_TEAM_ID deve ser um UUID canônico.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("redige falhas remotas e rejeita contagens incoerentes", async () => {
    const failedFetch = vi.fn().mockResolvedValue(new Response("nome=nao-vazar", { status: 503 }));
    await expect(runLineupPilotHealth({ supabaseUrl: "https://example.supabase.co", secretKey: "secret-test", teamId, fetchImpl: failedFetch })).rejects.toThrow("HTTP 503");

    const invalidFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ ...healthyPayload, consented_published_assignments: 5 }]), { status: 200 }));
    await expect(runLineupPilotHealth({ supabaseUrl: "https://example.supabase.co", secretKey: "secret-test", teamId, fetchImpl: invalidFetch })).rejects.toThrow("contrato inválido");
  });
});
