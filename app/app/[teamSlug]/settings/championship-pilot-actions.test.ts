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

import { setChampionshipPilotState } from "./championship-pilot-actions";

const teamId = "c8100000-0000-4000-8000-000000000001";

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

describe("controle operacional do piloto de campeonatos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CHAMPIONSHIP_PILOT_TEAM_ID", teamId);
    mocks.requireUser.mockResolvedValue({ id: "owner" });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: teamId, slug: "demo-campo" },
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: { team_id: teamId, feature: "championships", enabled: true },
      error: null,
    });
    vi.spyOn(console, "info").mockImplementation(mocks.info);
  });

  it("deriva a coorte pelo slug e ativa somente pela RPC auditada", async () => {
    await expect(setChampionshipPilotState({}, pilotForm())).resolves.toEqual({
      outcome: "success",
      message: "Piloto ativado somente para esta coorte.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("set_team_feature_flag", {
      requested_team_id: teamId,
      requested_feature: "championships",
      requested_enabled: true,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/app/demo-campo/championships",
    );
    expect(mocks.info).toHaveBeenCalledWith(
      "championship_pilot.flag_changed",
      { enabled: true },
    );
  });

  it("executa rollback pela mesma RPC e preserva o fluxo existente", async () => {
    mocks.rpc.mockResolvedValue({
      data: { team_id: teamId, feature: "championships", enabled: false },
      error: null,
    });
    await expect(setChampionshipPilotState(
      {},
      pilotForm({ enabled: "false" }),
    )).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("agenda, partidas e súmulas"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "set_team_feature_flag",
      expect.objectContaining({ requested_enabled: false }),
    );
  });

  it("recusa confirmação ausente e configuração inválida", async () => {
    await expect(setChampionshipPilotState(
      {},
      pilotForm({ confirmed: false }),
    )).resolves.toMatchObject({ outcome: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();

    vi.stubEnv("CHAMPIONSHIP_PILOT_TEAM_ID", "demo-campo");
    await expect(setChampionshipPilotState({}, pilotForm())).resolves.toEqual({
      outcome: "error",
      message: "O controle operacional do piloto está indisponível.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("recusa outro time antes de alterar a flag", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "c8100000-0000-4000-8000-000000000002",
        slug: "outro-time",
      },
      error: null,
    });
    await expect(setChampionshipPilotState(
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
    await expect(setChampionshipPilotState({}, pilotForm())).resolves.toEqual({
      outcome: "error",
      message: "Somente owner ou admin pode alterar o piloto.",
    });
  });
});
