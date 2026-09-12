import { describe, expect, it, vi } from "vitest";
import { runManagementListsPilotHealth } from "./management-lists-pilot-health.mjs";

const teamId = "fe161000-0000-4000-8000-000000000001";
const healthyPayload = {
  observed_at: "2026-09-12T12:00:00Z",
  team_open: true,
  complete_management_lists_enabled: true,
  total_events: 260,
  upcoming_events: 31,
  reschedule_events: 2,
  total_championships: 35,
  last_flag_change_at: "2026-09-12T11:00:00Z",
};

describe("sonda das listas completas", () => {
  it("consulta somente a RPC agregada e confirma o piloto ativo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl,
    })).resolves.toEqual(healthyPayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.supabase.co/rest/v1/rpc/get_complete_management_lists_health"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("confirma rollback sem apagar agenda ou campeonatos", async () => {
    const rollback = { ...healthyPayload, complete_management_lists_enabled: false };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([rollback]), { status: 200 }),
    );
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl,
    })).resolves.toEqual(rollback);
    expect(rollback.total_events).toBe(260);
    expect(rollback.total_championships).toBe(35);
  });

  it("falha fechado em estado divergente ou sem marco de ativação", async () => {
    const disabledFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, complete_management_lists_enabled: false }]), { status: 200 }),
    );
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: disabledFetch,
    })).rejects.toThrow("esperava listas completas ativas");

    const noAuditFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, last_flag_change_at: null }]), { status: 200 }),
    );
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: noAuditFetch,
    })).rejects.toThrow("marco operacional");
  });

  it("rejeita UUID, coorte e contrato inválidos", async () => {
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId: "inválido",
    })).rejects.toThrow("UUID canônico");

    const emptyFetch = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl: emptyFetch,
    })).rejects.toThrow("não encontrou a coorte");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, total_events: -1 }]), { status: 200 }),
    );
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl: invalidFetch,
    })).rejects.toThrow("contrato inválido");
  });

  it("propaga indisponibilidade sem expor resposta", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("segredo", { status: 503 }));
    await expect(runManagementListsPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl,
    })).rejects.toThrow("HTTP 503");
  });
});
