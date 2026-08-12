import { describe, expect, it, vi } from "vitest";
import { runEventSharePilotHealth } from "./event-share-pilot-health.mjs";

const teamId = "10000000-0000-4000-8000-000000000081";
const healthyPayload = {
  observed_at: "2026-08-12T18:30:00Z",
  event_share_card_enabled: true,
  public_event_page_enabled: true,
  event_matches_enabled: true,
  voting_enabled: true,
  window_events: 4,
  projected_events: 4,
  fallback_events: 0,
  call_events: 1,
  lineup_events: 1,
  live_events: 1,
  voting_events: 0,
  result_events: 1,
  score_events: 0,
  cancelled_events: 0,
  completed_events: 0,
  last_flag_change_at: "2026-08-12T18:20:00Z",
};

describe("sonda operacional do cartão público", () => {
  it("consulta somente a RPC agregada e normaliza contagens", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );

    await expect(
      runEventSharePilotHealth({
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
        "https://example.supabase.co/rest/v1/rpc/get_event_share_card_pilot_health",
      ),
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ requested_team_id: teamId }),
    });
  });

  it("falha fechado quando a coorte esperada perde um gate", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { ...healthyPayload, public_event_page_enabled: false },
        ]),
        { status: 200 },
      ),
    );

    await expect(
      runEventSharePilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        fetchImpl,
      }),
    ).rejects.toThrow("Piloto do cartão público deveria estar ativo");
  });

  it("confirma rollback e recusa coorte inválida", async () => {
    const disabledFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            ...healthyPayload,
            event_share_card_enabled: false,
            projected_events: 0,
            fallback_events: 4,
            call_events: 0,
            lineup_events: 0,
            live_events: 0,
            result_events: 0,
          },
        ]),
        { status: 200 },
      ),
    );
    await expect(
      runEventSharePilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: false,
        fetchImpl: disabledFetch,
      }),
    ).resolves.toMatchObject({ event_share_card_enabled: false });

    const fetchImpl = vi.fn();
    await expect(
      runEventSharePilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId: "../outro-time",
        fetchImpl,
      }),
    ).rejects.toThrow(
      "EVENT_SHARE_PILOT_TEAM_ID deve ser um UUID canônico.",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("redige falha remota e rejeita agregados incoerentes", async () => {
    const failedFetch = vi.fn().mockResolvedValue(
      new Response("public_id=nao-vazar", { status: 503 }),
    );
    await expect(
      runEventSharePilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        fetchImpl: failedFetch,
      }),
    ).rejects.toThrow(
      "Sonda operacional do cartão público indisponível: HTTP 503.",
    );

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ ...healthyPayload, projected_events: 3 }]),
        { status: 200 },
      ),
    );
    await expect(
      runEventSharePilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        fetchImpl: invalidFetch,
      }),
    ).rejects.toThrow(
      "Sonda operacional do cartão público retornou contrato inválido.",
    );
  });
});
