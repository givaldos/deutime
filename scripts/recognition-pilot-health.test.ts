import { describe, expect, it, vi } from "vitest";
import { runRecognitionPilotHealth } from "./recognition-pilot-health.mjs";

const teamId = "e0200000-0000-4000-8000-000000000001";
const healthyPayload = {
  observed_at: "2026-08-22T12:00:00Z",
  recognition_enabled: true,
  activation_captured: true,
  active_claimed_athletes: 2,
  source_cards: 4,
  source_goal_cards: 2,
  source_assist_cards: 1,
  source_crowd_star_cards: 1,
  projected_cards: 4,
  projected_goal_cards: 2,
  projected_assist_cards: 1,
  projected_crowd_star_cards: 1,
  reconstruction_mismatches: 0,
  granted_consents: 1,
  revoked_consents: 0,
  public_cards: 3,
  consent_commands_24h: 1,
  last_consent_command_at: "2026-08-22T11:50:00Z",
  last_flag_change_at: "2026-08-22T11:30:00Z",
  activated_at: "2026-08-22T11:30:00Z",
};

describe("sonda operacional de reconhecimentos", () => {
  it("consulta somente a RPC agregada e valida a coorte ativa", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );

    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        expectProjection: true,
        expectPublicSummary: true,
        fetchImpl,
      }),
    ).resolves.toEqual(healthyPayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        "https://example.supabase.co/rest/v1/rpc/get_recognition_pilot_health",
      ),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("confirma rollback sem apagar as fontes esportivas", async () => {
    const rollbackPayload = {
      ...healthyPayload,
      recognition_enabled: false,
      projected_cards: 0,
      projected_goal_cards: 0,
      projected_assist_cards: 0,
      projected_crowd_star_cards: 0,
      public_cards: 0,
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([rollbackPayload]), { status: 200 }),
    );

    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        fetchImpl,
      }),
    ).resolves.toEqual(rollbackPayload);
    expect(rollbackPayload.source_cards).toBe(4);
  });

  it("interrompe em divergência, ausência de projeção ou resumo", async () => {
    const mismatchFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { ...healthyPayload, reconstruction_mismatches: 1 },
        ]),
        { status: 200 },
      ),
    );
    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        fetchImpl: mismatchFetch,
      }),
    ).rejects.toThrow("projeção ou rollback divergente");

    const emptyFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            ...healthyPayload,
            source_cards: 0,
            source_goal_cards: 0,
            source_assist_cards: 0,
            source_crowd_star_cards: 0,
            projected_cards: 0,
            projected_goal_cards: 0,
            projected_assist_cards: 0,
            projected_crowd_star_cards: 0,
            public_cards: 0,
          },
        ]),
        { status: 200 },
      ),
    );
    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        expectProjection: true,
        fetchImpl: emptyFetch,
      }),
    ).rejects.toThrow("não possui reconhecimentos projetados");

    const privateFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { ...healthyPayload, granted_consents: 0, public_cards: 0 },
        ]),
        { status: 200 },
      ),
    );
    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        expectPublicSummary: true,
        fetchImpl: privateFetch,
      }),
    ).rejects.toThrow("não possui resumo público consentido");
  });

  it("redige falha remota e rejeita entrada ou contrato inválidos", async () => {
    const failedFetch = vi.fn().mockResolvedValue(
      new Response("athlete_id=nao-vazar", { status: 503 }),
    );
    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        fetchImpl: failedFetch,
      }),
    ).rejects.toThrow("indisponível: HTTP 503");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ ...healthyPayload, source_cards: 5 }]),
        { status: 200 },
      ),
    );
    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectEnabled: true,
        fetchImpl: invalidFetch,
      }),
    ).rejects.toThrow("contrato inválido");

    const untouchedFetch = vi.fn();
    await expect(
      runRecognitionPilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId: "../outro-time",
        fetchImpl: untouchedFetch,
      }),
    ).rejects.toThrow("deve ser um UUID canônico");
    expect(untouchedFetch).not.toHaveBeenCalled();
  });
});
