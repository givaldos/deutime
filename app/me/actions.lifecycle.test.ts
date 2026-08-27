import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createClient: vi.fn(),
  createPrivilegedClient: vi.fn(),
  rpc: vi.fn(),
  privilegedRpc: vi.fn(),
  getUser: vi.fn(),
  getClaims: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  remove: vi.fn(),
  deleteUser: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: mocks.createPrivilegedClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  closeMyAccount,
  closeMyTeam,
  leaveMyTeam,
  withdrawMyTeamRequest,
} from "./actions";

const userId = "ae100000-0000-4000-8000-000000000001";
const teamId = "ae200000-0000-4000-8000-000000000001";
const relationshipId = "ae300000-0000-4000-8000-000000000001";
const requestId = "ae400000-0000-4000-8000-000000000001";

describe("ações de autonomia em /me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: userId, email: "pessoa@example.com" });
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: "pessoa@example.com" } }, error: null });
    mocks.getClaims.mockResolvedValue({ data: { claims: { iat: Math.floor(Date.now() / 1000) } }, error: null });
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.privilegedRpc.mockResolvedValue({ data: true, error: null });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.deleteUser.mockResolvedValue({ data: { user: {} }, error: null });
    mocks.createClient.mockResolvedValue({
      rpc: mocks.rpc,
      auth: {
        getUser: mocks.getUser,
        getClaims: mocks.getClaims,
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
      },
    });
    mocks.createPrivilegedClient.mockReturnValue({
      rpc: mocks.privilegedRpc,
      storage: { from: () => ({ remove: mocks.remove }) },
      auth: { admin: { deleteUser: mocks.deleteUser } },
    });
  });

  it("retira somente o pedido validado pela RPC da sessão", async () => {
    await expect(withdrawMyTeamRequest(form({ relationshipId }))).rejects.toThrow(
      "REDIRECT:/me?relationship=withdrawn#vinculos",
    );
    expect(mocks.rpc).toHaveBeenCalledWith("withdraw_my_team_request", {
      requested_athlete_id: relationshipId,
      request_id: requestId,
    });
  });

  it("explica a barreira do último proprietário", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "23514" } });
    await expect(leaveMyTeam(form({ teamId }))).rejects.toThrow(
      "REDIRECT:/me?relationship=last-owner#vinculos",
    );
  });

  it("reautentica antes de emitir autorização e encerrar o time", async () => {
    await expect(
      closeMyTeam(form({ teamId, password: "senha-segura", confirmation: "Time Exato" })),
    ).rejects.toThrow("REDIRECT:/me?relationship=team-closed#vinculos");

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "pessoa@example.com",
      password: "senha-segura",
      options: { captchaToken: undefined },
    });
    expect(mocks.privilegedRpc).toHaveBeenCalledWith(
      "issue_lifecycle_authorization",
      {
        requested_user_id: userId,
        request_id: requestId,
        requested_purpose: "close_team",
        requested_team_id: teamId,
      },
    );
    expect(mocks.rpc).toHaveBeenCalledWith("close_my_team", {
      requested_team_id: teamId,
      requested_team_name: "Time Exato",
      request_id: requestId,
    });
  });

  it("bloqueia e mantém retry quando o provedor Auth falha", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { request_id: requestId, paths: [`${userId}/profile/foto.webp`] },
      error: null,
    });
    mocks.deleteUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "provider failed / PII" },
    });

    await expect(
      closeMyAccount(form({ password: "senha-segura", confirmation: "ENCERRAR" })),
    ).rejects.toThrow("REDIRECT:/auth/login?account=closing");

    expect(mocks.remove).toHaveBeenCalledWith([`${userId}/profile/foto.webp`]);
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId, true);
    expect(mocks.privilegedRpc).toHaveBeenLastCalledWith(
      "complete_account_closure",
      {
        requested_request_id: requestId,
        requested_error_code: "provider_failed_pii",
      },
    );
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("não emite autorização quando a senha está incorreta", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { code: "invalid_credentials" },
    });
    await expect(
      closeMyAccount(form({ password: "errada", confirmation: "ENCERRAR" })),
    ).rejects.toThrow("REDIRECT:/me?relationship=reauthentication#vinculos");
    expect(mocks.createPrivilegedClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

function form(values: Record<string, string>) {
  const data = new FormData();
  data.set("requestId", requestId);
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
