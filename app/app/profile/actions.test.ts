import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateMyAccountProfile } from "./actions";

describe("updateMyAccountProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.from.mockReturnValue(
      createProfileQuery({ data: { handle: "atleta-um" }, error: null }),
    );
    mocks.rpc.mockResolvedValue({ data: "Nome Atualizado", error: null });
    mocks.createClient.mockResolvedValue({
      from: mocks.from,
      rpc: mocks.rpc,
    });
  });

  it("valida e delega somente o nome para a RPC derivada da sessão", async () => {
    const result = await updateMyAccountProfile({}, profileForm("  Nome Atualizado  "));

    expect(result).toEqual({
      outcome: "success",
      message: "Perfil atualizado.",
    });
    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("update_my_account_profile", {
      requested_display_name: "Nome Atualizado",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/atleta-um");
  });

  it("rejeita nome inválido antes de consultar o banco", async () => {
    const result = await updateMyAccountProfile({}, profileForm("A"));

    expect(result).toMatchObject({ outcome: "error" });
    expect(result.errors?.displayName).toBeDefined();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("fecha com mensagem segura quando a atualização é negada", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });

    const result = await updateMyAccountProfile({}, profileForm("Nome Válido"));

    expect(result).toEqual({
      outcome: "error",
      message: "Sua sessão expirou. Entre novamente para salvar.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

function profileForm(displayName: string) {
  const formData = new FormData();
  formData.set("displayName", displayName);
  return formData;
}

function createProfileQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}
