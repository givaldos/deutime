import { describe, expect, it, vi } from "vitest";
import { runR12PilotHealth } from "./r12-pilot-health.mjs";

const teamId = "f3110000-0000-4000-8000-000000000001";
const healthyPayload = {
  observed_at: "2026-08-31T12:00:00Z",
  team_open: true,
  account_autonomy_enabled: true,
  registration_email_alerts_enabled: true,
  registration_email_delivery_enabled: true,
  pending_account_closures: 0,
  stalled_account_closures: 0,
  pending_team_storage_jobs: 0,
  failed_team_storage_jobs: 0,
  pending_email_events: 1,
  pending_email_deliveries: 1,
  failed_email_deliveries: 0,
  review_email_deliveries: 0,
  lifecycle_commands_24h: 1,
  registration_email_commands_24h: 1,
  last_control_change_at: "2026-08-31T11:00:00Z",
  last_lifecycle_command_at: "2026-08-31T11:10:00Z",
  last_registration_email_command_at: "2026-08-31T11:20:00Z",
};

describe("sonda operacional da R12", () => {
  it("consulta somente a RPC agregada e valida o piloto ativo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );

    await expect(
      runR12PilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectAccountAutonomy: true,
        expectEmailAlerts: true,
        expectEmailDelivery: true,
        expectLifecycleActivity: true,
        expectEmailActivity: true,
        fetchImpl,
      }),
    ).resolves.toEqual(healthyPayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.supabase.co/rest/v1/rpc/get_r12_pilot_health"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("confirma rollback sem apagar a atividade operacional", async () => {
    const rollbackPayload = {
      ...healthyPayload,
      account_autonomy_enabled: false,
      registration_email_alerts_enabled: false,
      registration_email_delivery_enabled: false,
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([rollbackPayload]), { status: 200 }),
    );

    await expect(
      runR12PilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectLifecycleActivity: true,
        expectEmailActivity: true,
        fetchImpl,
      }),
    ).resolves.toEqual(rollbackPayload);
    expect(rollbackPayload.pending_email_events).toBe(1);
  });

  it("interrompe em estado divergente, intervenção ou contrato inválido", async () => {
    const enabledFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );
    await expect(
      runR12PilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        fetchImpl: enabledFetch,
      }),
    ).rejects.toThrow("esperava autonomia de conta desligada");

    const reviewFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ ...healthyPayload, review_email_deliveries: 1 }]),
        { status: 200 },
      ),
    );
    await expect(
      runR12PilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectAccountAutonomy: true,
        expectEmailAlerts: true,
        expectEmailDelivery: true,
        fetchImpl: reviewFetch,
      }),
    ).rejects.toThrow("exige intervenção");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, team_open: "yes" }]), {
        status: 200,
      }),
    );
    await expect(
      runR12PilotHealth({
        supabaseUrl: "https://example.supabase.co",
        secretKey: "secret-test",
        teamId,
        expectAccountAutonomy: true,
        expectEmailAlerts: true,
        expectEmailDelivery: true,
        fetchImpl: invalidFetch,
      }),
    ).rejects.toThrow("contrato inválido");
  });
});
