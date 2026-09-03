import { describe, expect, it, vi } from "vitest";
import { runR13PilotHealth } from "./r13-pilot-health.mjs";

const teamId = "f2200000-0000-4000-8000-000000000001";
const healthyPayload = {
  observed_at: "2026-09-03T12:00:00Z",
  team_open: true,
  professional_scheduling_enabled: true,
  whatsapp_delivery_enabled: true,
  integration_produce_enabled: true,
  integration_consume_enabled: true,
  configuration_complete: true,
  active_internal_teams: 2,
  upcoming_events: 3,
  scheduled_events: 2,
  pending_review_events: 1,
  date_tbd_events: 0,
  postponed_events: 0,
  pending_conflicts: 1,
  hard_conflicts: 1,
  warning_conflicts: 0,
  stale_conflicts: 0,
  schedule_state_mismatches: 0,
  accepted_exceptions_24h: 0,
  commands_24h: 1,
  notifications_pending: 0,
  notifications_processing: 0,
  notifications_failed: 0,
  notifications_sent_24h: 1,
  last_flag_change_at: "2026-09-03T11:00:00Z",
  last_decision_at: null,
};

describe("sonda operacional da R13", () => {
  it("consulta somente a RPC agregada e valida o piloto ativo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectProfessionalScheduling: true,
      expectNotificationDelivery: true,
      expectActivity: true,
      fetchImpl,
    })).resolves.toEqual(healthyPayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.supabase.co/rest/v1/rpc/get_r13_pilot_health"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("confirma rollback sem apagar eventos nem atividade", async () => {
    const rollbackPayload = {
      ...healthyPayload,
      professional_scheduling_enabled: false,
      configuration_complete: true,
      stale_conflicts: 1,
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([rollbackPayload]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectActivity: true,
      fetchImpl,
    })).resolves.toEqual(rollbackPayload);
    expect(rollbackPayload.upcoming_events).toBe(3);
  });

  it("interrompe em divergência ou falha operacional", async () => {
    const mismatchFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, schedule_state_mismatches: 1 }]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectProfessionalScheduling: true,
      fetchImpl: mismatchFetch,
    })).rejects.toThrow("exige intervenção");

    const failedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, notifications_failed: 1 }]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectProfessionalScheduling: true,
      fetchImpl: failedFetch,
    })).rejects.toThrow("exige intervenção");
  });

  it("falha fechado sem configuração, entrega ou atividade esperada", async () => {
    const configFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, configuration_complete: false }]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectProfessionalScheduling: true,
      fetchImpl: configFetch,
    })).rejects.toThrow("duas equipes padrão válidas");

    const deliveryFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, integration_consume_enabled: false }]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectProfessionalScheduling: true,
      expectNotificationDelivery: true,
      fetchImpl: deliveryFetch,
    })).rejects.toThrow("não está integralmente habilitada");

    const idleFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, commands_24h: 0 }]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectProfessionalScheduling: true,
      expectActivity: true,
      fetchImpl: idleFetch,
    })).rejects.toThrow("não registrou atividade recente");
  });

  it("rejeita coorte, resposta ou contrato inválidos", async () => {
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId: "demo-campo",
    })).rejects.toThrow("UUID canônico");

    const missingFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl: missingFetch,
    })).rejects.toThrow("não encontrou a coorte");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, team_open: "yes" }]), { status: 200 }),
    );
    await expect(runR13PilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectProfessionalScheduling: true,
      fetchImpl: invalidFetch,
    })).rejects.toThrow("contrato inválido");
  });
});
