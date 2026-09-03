import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  info: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
      })),
    })),
    rpc: mocks.rpc,
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { setProfessionalSchedulingPilotState } from "./professional-scheduling-pilot-actions";

const teamId = "f2200000-0000-4000-8000-000000000001";

function pilotForm({
  slug = "demo-campo",
  enabled = "true",
  confirmed = true,
}: {
  slug?: string;
  enabled?: string;
  confirmed?: boolean;
} = {}) {
  const form = new FormData();
  form.set("teamSlug", slug);
  form.set("enabled", enabled);
  if (confirmed) form.set("confirmation", "confirmed");
  return form;
}

describe("controle operacional do piloto da agenda profissional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("R13_PILOT_TEAM_ID", teamId);
    mocks.requireUser.mockResolvedValue({ id: "owner" });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: teamId, slug: "demo-campo" },
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: {
        team_id: teamId,
        feature: "professional_scheduling",
        enabled: true,
      },
      error: null,
    });
    vi.spyOn(console, "info").mockImplementation(mocks.info);
  });

  it("ativa somente a coorte pela RPC auditada", async () => {
    await expect(
      setProfessionalSchedulingPilotState({}, pilotForm()),
    ).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenCalledWith("set_professional_scheduling_pilot_state", {
      requested_team_id: teamId,
      requested_enabled: true,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/app/demo-campo/events/pending",
    );
    expect(mocks.info).toHaveBeenCalledWith(
      "professional_scheduling_pilot.flag_changed",
      { enabled: true },
    );
  });

  it("executa rollback pela mesma RPC sem apagar o histórico", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        team_id: teamId,
        feature: "professional_scheduling",
        enabled: false,
      },
      error: null,
    });
    await expect(setProfessionalSchedulingPilotState(
      {},
      pilotForm({ enabled: "false" }),
    )).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("eventos, campeonatos e decisões"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "set_professional_scheduling_pilot_state",
      expect.objectContaining({ requested_enabled: false }),
    );
  });

  it("recusa confirmação ausente e configuração inválida", async () => {
    await expect(setProfessionalSchedulingPilotState(
      {},
      pilotForm({ confirmed: false }),
    )).resolves.toMatchObject({ outcome: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();

    vi.stubEnv("R13_PILOT_TEAM_ID", "demo-campo");
    await expect(
      setProfessionalSchedulingPilotState({}, pilotForm()),
    ).resolves.toEqual({
      outcome: "error",
      message: "O controle operacional do piloto está indisponível.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("recusa outro time antes de tocar a flag", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "f2200000-0000-4000-8000-000000000002",
        slug: "outro-time",
      },
      error: null,
    });
    await expect(setProfessionalSchedulingPilotState(
      {},
      pilotForm({ slug: "outro-time" }),
    )).resolves.toEqual({
      outcome: "error",
      message: "Este time não pertence à coorte autorizada.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("preserva a negação para quem não é owner/admin", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(
      setProfessionalSchedulingPilotState({}, pilotForm()),
    ).resolves.toEqual({
      outcome: "error",
      message: "Somente owner ou admin pode alterar o piloto.",
    });
  });

  it("recusa ativação antes das duas equipes padrão", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "55000" } });
    await expect(
      setProfessionalSchedulingPilotState({}, pilotForm()),
    ).resolves.toEqual({
      outcome: "error",
      message: "Configure e salve duas equipes padrão antes de ativar o piloto.",
    });
  });
});
