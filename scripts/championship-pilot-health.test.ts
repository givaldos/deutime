import { describe, expect, it, vi } from "vitest";
import { runChampionshipPilotHealth } from "./championship-pilot-health.mjs";

const teamId = "10000000-0000-4000-8000-000000000091";
const healthyPayload = {
  observed_at: "2026-08-13T18:30:00Z",
  championships_enabled: true,
  public_event_page_enabled: true,
  championships_total: 3,
  draft_championships: 0,
  published_championships: 1,
  active_championships: 1,
  completed_championships: 1,
  archived_championships: 0,
  league_championships: 1,
  groups_knockout_championships: 1,
  knockout_championships: 1,
  page_candidates: 2,
  projected_championships: 2,
  fallback_championships: 0,
  participants_total: 10,
  fixtures_total: 12,
  linked_fixtures: 4,
  finalized_fixtures: 2,
  void_fixtures: 1,
  resolved_fixtures: 3,
  projected_participants: 8,
  projected_fixtures: 9,
  projected_standings: 6,
  reconstruction_mismatches: 0,
  commands_24h: 15,
  last_command_at: "2026-08-13T18:20:00Z",
  last_flag_change_at: "2026-08-13T18:00:00Z",
};

describe("sonda operacional de campeonatos", () => {
  it("consulta somente a RPC agregada e normaliza as contagens", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );

    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      expectProjection: true,
      fetchImpl,
    })).resolves.toEqual(healthyPayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.supabase.co/rest/v1/rpc/get_championship_pilot_health"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("falha fechado quando a flag ou a projeção esperada não está saudável", async () => {
    const disabledFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{
        ...healthyPayload,
        championships_enabled: false,
        projected_championships: 0,
        fallback_championships: 2,
        projected_participants: 0,
        projected_fixtures: 0,
        projected_standings: 0,
      }]), { status: 200 }),
    );
    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: disabledFetch,
    })).rejects.toThrow("deveria estar ativo");

    const emptyProjectionFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{
        ...healthyPayload,
        page_candidates: 0,
        projected_championships: 0,
        participants_total: 0,
        fixtures_total: 0,
        linked_fixtures: 0,
        finalized_fixtures: 0,
        void_fixtures: 0,
        resolved_fixtures: 0,
        projected_participants: 0,
        projected_fixtures: 0,
        projected_standings: 0,
      }]), { status: 200 }),
    );
    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      expectProjection: true,
      fetchImpl: emptyProjectionFetch,
    })).rejects.toThrow("não possui uma projeção pública completa");
  });

  it("confirma rollback e recusa divergência reconstruível", async () => {
    const disabledPayload = {
      ...healthyPayload,
      championships_enabled: false,
      projected_championships: 0,
      fallback_championships: 2,
      projected_participants: 0,
      projected_fixtures: 0,
      projected_standings: 0,
    };
    const disabledFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([disabledPayload]), { status: 200 }),
    );
    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl: disabledFetch,
    })).resolves.toEqual(disabledPayload);

    const mismatchFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{
        ...healthyPayload,
        reconstruction_mismatches: 1,
      }]), { status: 200 }),
    );
    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: mismatchFetch,
    })).rejects.toThrow("detectou projeção ou reconstrução divergente");
  });

  it("redige falha remota e rejeita contrato ou coorte inválidos", async () => {
    const failedFetch = vi.fn().mockResolvedValue(
      new Response("public_id=nao-vazar", { status: 503 }),
    );
    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl: failedFetch,
    })).rejects.toThrow("indisponível: HTTP 503");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{
        ...healthyPayload,
        league_championships: 2,
      }]), { status: 200 }),
    );
    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: invalidFetch,
    })).rejects.toThrow("contrato inválido");

    const untouchedFetch = vi.fn();
    await expect(runChampionshipPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId: "../outro-time",
      fetchImpl: untouchedFetch,
    })).rejects.toThrow("deve ser um UUID canônico");
    expect(untouchedFetch).not.toHaveBeenCalled();
  });
});
