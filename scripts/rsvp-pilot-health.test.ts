import { describe, expect, it, vi } from "vitest";
import { runRsvpPilotHealth } from "./rsvp-pilot-health.mjs";

const teamId = "10000000-0000-0000-0000-000000000001";

const healthyPayload = {
  observed_at: "2026-07-30T23:30:00.000Z",
  global_exchange_enabled: true,
  team_exchange_enabled: true,
  team_rsvp_enabled: true,
  active_credentials: 1,
  active_capability_sessions: 2,
  capability_sessions_created_24h: 3,
  capability_sessions_revoked_24h: 1,
  rsvp_writes_24h: 3,
  last_exchange_at: "2026-07-30T23:20:00.000Z",
  last_rsvp_at: "2026-07-30T23:25:00.000Z",
};

describe("sonda operacional do piloto RSVP", () => {
  it("consulta somente a RPC agregada e normaliza contagens", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      runRsvpPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        fetchImpl,
      }),
    ).resolves.toEqual(healthyPayload);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[0]).toEqual(
      new URL(
        "https://example.supabase.co/rest/v1/rpc/get_event_capability_pilot_health",
      ),
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ requested_team_id: teamId }),
    });
  });

  it("falha fechado quando o piloto esperado perde um gate", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { ...healthyPayload, team_rsvp_enabled: false },
        ]),
        { status: 200 },
      ),
    );

    await expect(
      runRsvpPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        fetchImpl,
      }),
    ).rejects.toThrow(
      "Piloto RSVP deveria estar ativo, mas ao menos um gate está desligado.",
    );
  });

  it("recusa coorte inválida antes de qualquer requisição", async () => {
    const fetchImpl = vi.fn();

    await expect(
      runRsvpPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId: "../outro-time",
        fetchImpl,
      }),
    ).rejects.toThrow("RSVP_PILOT_TEAM_ID deve ser um UUID canônico.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("redige a resposta remota em falhas e rejeita contrato inesperado", async () => {
    const failedFetch = vi.fn().mockResolvedValue(
      new Response("credential_secret=nao-vazar", { status: 503 }),
    );

    await expect(
      runRsvpPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        fetchImpl: failedFetch,
      }),
    ).rejects.toThrow("Sonda operacional do RSVP indisponível: HTTP 503.");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, rsvp_writes_24h: -1 }]), {
        status: 200,
      }),
    );

    await expect(
      runRsvpPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        fetchImpl: invalidFetch,
      }),
    ).rejects.toThrow(
      "Sonda operacional do RSVP retornou contrato inválido.",
    );
  });
});
