import { describe, expect, it, vi } from "vitest";
import { runRecognizableRosterPilotHealth } from "./recognizable-roster-pilot-health.mjs";

const teamId = "fc161000-0000-4000-8000-000000000001";
const healthyPayload = {
  observed_at: "2026-09-14T12:00:00Z",
  team_open: true,
  recognizable_roster_enabled: true,
  current_athletes: 24,
  active_athletes: 20,
  pending_athletes: 2,
  claimed_athletes: 12,
  athletes_with_photo_source: 15,
  last_flag_change_at: "2026-09-14T11:00:00Z",
};

describe("sonda do elenco reconhecível", () => {
  it("consulta somente a RPC agregada e confirma o piloto ativo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([healthyPayload]), { status: 200 }),
    );
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl,
    })).resolves.toEqual(healthyPayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.supabase.co/rest/v1/rpc/get_recognizable_roster_health"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requested_team_id: teamId }),
      }),
    );
  });

  it("confirma rollback sem apagar vínculos ou fontes de foto", async () => {
    const rollback = { ...healthyPayload, recognizable_roster_enabled: false };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([rollback]), { status: 200 }),
    );
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl,
    })).resolves.toEqual(rollback);
    expect(rollback.current_athletes).toBe(24);
    expect(rollback.athletes_with_photo_source).toBe(15);
  });

  it("falha fechado em estado divergente ou sem marco operacional", async () => {
    const disabledFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, recognizable_roster_enabled: false }]), { status: 200 }),
    );
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: disabledFetch,
    })).rejects.toThrow("esperava elenco reconhecível ativo");

    const noAuditFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, last_flag_change_at: null }]), { status: 200 }),
    );
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: noAuditFetch,
    })).rejects.toThrow("marco operacional");
  });

  it("rejeita UUID, coorte, time fechado e contrato inválidos", async () => {
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId: "inválido",
    })).rejects.toThrow("UUID canônico");

    const emptyFetch = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl: emptyFetch,
    })).rejects.toThrow("não encontrou a coorte");

    const closedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, team_open: false }]), { status: 200 }),
    );
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: closedFetch,
    })).rejects.toThrow("encerrada");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...healthyPayload, current_athletes: -1 }]), { status: 200 }),
    );
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      expectEnabled: true,
      fetchImpl: invalidFetch,
    })).rejects.toThrow("contrato inválido");
  });

  it("propaga indisponibilidade sem expor a resposta", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("segredo", { status: 503 }));
    await expect(runRecognizableRosterPilotHealth({
      supabaseUrl: "https://example.supabase.co",
      secretKey: "secret-test",
      teamId,
      fetchImpl,
    })).rejects.toThrow("HTTP 503");
  });
});
