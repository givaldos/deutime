import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { updateRegistrationEmailPreference } from "./actions";

const teamId = "11111111-1111-4111-8111-111111111111";
function form(enabled: boolean) {
  const data = new FormData();
  data.set("teamId", teamId);
  data.set("teamSlug", "avisos-fc");
  if (enabled) data.set("enabled", "on");
  return data;
}

describe("ação da preferência de aviso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "owner" });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
  });

  it("delega a escolha própria para a RPC e revalida o time", async () => {
    await expect(updateRegistrationEmailPreference({}, form(true))).resolves.toEqual({
      outcome: "success",
      message: "Preferência de aviso salva.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("set_my_registration_email_preference", {
      requested_team_id: teamId,
      requested_enabled: true,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/avisos-fc/settings");
  });

  it("preserva a negação da RPC para pessoa sem papel elegível", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(updateRegistrationEmailPreference({}, form(false))).resolves.toEqual({
      outcome: "error",
      message: "Você não tem permissão para alterar este aviso.",
    });
  });
});
