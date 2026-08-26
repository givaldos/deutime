import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  privilegedRpc: vi.fn(),
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
vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: vi.fn(() => ({ rpc: mocks.privilegedRpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { setRecognitionPilotState } from "./recognition-pilot-actions";

const teamId = "c8100000-0000-4000-8000-000000000010";
const pilotSlug = "r10-demo-reconhecimentos";
const health = (enabled: boolean) => [{
  recognition_enabled: enabled,
  activation_captured: enabled,
  projected_cards: 0,
  public_cards: 0,
  reconstruction_mismatches: 0,
}];

function pilotForm({
  slug = pilotSlug,
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

describe("controle operacional do piloto de reconhecimentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "owner" });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: teamId, slug: pilotSlug },
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: { team_id: teamId, feature: "recognition", enabled: true },
      error: null,
    });
    mocks.privilegedRpc
      .mockResolvedValueOnce({ data: health(false), error: null })
      .mockResolvedValueOnce({ data: health(true), error: null });
    vi.spyOn(console, "info").mockImplementation(mocks.info);
  });

  it("deriva o time pela coorte fechada e ativa pela RPC auditada", async () => {
    await expect(setRecognitionPilotState({}, pilotForm())).resolves.toEqual({
      outcome: "success",
      message: "Piloto ativado somente neste time de teste.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("set_team_feature_flag", {
      requested_team_id: teamId,
      requested_feature: "recognition",
      requested_enabled: true,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me/reconhecimentos");
    expect(mocks.info).toHaveBeenCalledWith(
      "recognition_pilot.flag_changed",
      { enabled: true },
    );
  });

  it("executa rollback pela mesma RPC e preserva os fatos", async () => {
    mocks.privilegedRpc.mockReset();
    mocks.privilegedRpc
      .mockResolvedValueOnce({ data: health(true), error: null })
      .mockResolvedValueOnce({ data: health(false), error: null });
    mocks.rpc.mockResolvedValue({
      data: { team_id: teamId, feature: "recognition", enabled: false },
      error: null,
    });
    await expect(setRecognitionPilotState(
      {},
      pilotForm({ enabled: "false" }),
    )).resolves.toMatchObject({
      outcome: "success",
      message: expect.stringContaining("fatos esportivos"),
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "set_team_feature_flag",
      expect.objectContaining({ requested_enabled: false }),
    );
  });

  it("recusa confirmação ausente", async () => {
    await expect(setRecognitionPilotState(
      {},
      pilotForm({ confirmed: false }),
    )).resolves.toMatchObject({ outcome: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("recusa outro time antes de consultar ou alterar a flag", async () => {
    await expect(setRecognitionPilotState(
      {},
      pilotForm({ slug: "outro-time" }),
    )).resolves.toEqual({
      outcome: "error",
      message: "Este time não está autorizado para o teste.",
    });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("preserva a negação para quem não é owner ou admin", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(setRecognitionPilotState({}, pilotForm())).resolves.toEqual({
      outcome: "error",
      message: "Somente owner ou admin pode alterar o piloto.",
    });
  });

  it("bloqueia ativação quando a pré-sonda não está desligada", async () => {
    mocks.privilegedRpc.mockReset();
    mocks.privilegedRpc.mockResolvedValue({ data: health(true), error: null });
    await expect(setRecognitionPilotState({}, pilotForm())).resolves.toEqual({
      outcome: "error",
      message: "A verificação inicial não autorizou a alteração do piloto.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reverte imediatamente quando a pós-sonda não confirma a ativação", async () => {
    mocks.privilegedRpc.mockReset();
    mocks.privilegedRpc
      .mockResolvedValueOnce({ data: health(false), error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "unexpected" } });
    await expect(setRecognitionPilotState({}, pilotForm())).resolves.toEqual({
      outcome: "error",
      message: "A verificação final falhou e a ativação foi revertida.",
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith("set_team_feature_flag", {
      requested_team_id: teamId,
      requested_feature: "recognition",
      requested_enabled: false,
    });
  });
});
