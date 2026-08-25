import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  updateUser: vi.fn(),
  signInWithPassword: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  updateMyAccountEmail,
  updateMyAccountPassword,
  updateMyAccountProfile,
} from "./actions";

describe("updateMyAccountProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      email: "atual@example.com",
    });
    mocks.from.mockReturnValue(
      createProfileQuery({ data: { handle: "atleta-um" }, error: null }),
    );
    mocks.rpc.mockResolvedValue({ data: "Nome Atualizado", error: null });
    mocks.updateUser.mockResolvedValue({ data: { user: {} }, error: null });
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });
    mocks.createClient.mockResolvedValue({
      from: mocks.from,
      rpc: mocks.rpc,
      auth: {
        updateUser: mocks.updateUser,
        signInWithPassword: mocks.signInWithPassword,
      },
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

  it("solicita a troca de e-mail da própria sessão", async () => {
    const result = await updateMyAccountEmail(
      {},
      emailForm(" NOVO@EXAMPLE.COM "),
    );

    expect(mocks.updateUser).toHaveBeenCalledWith({
      email: "novo@example.com",
    });
    expect(result).toEqual({
      outcome: "success",
      message:
        "Solicitação enviada. Confirme a troca pelos e-mails recebidos antes de usar o novo endereço.",
    });
  });

  it("não solicita troca para o mesmo e-mail", async () => {
    const result = await updateMyAccountEmail(
      {},
      emailForm("ATUAL@example.com"),
    );

    expect(result).toMatchObject({ outcome: "error" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("confirma a senha atual antes de atualizar a senha", async () => {
    const result = await updateMyAccountPassword(
      {},
      passwordForm("Atual@2026!segura", "Nova@2026!segura"),
    );

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "atual@example.com",
      password: "Atual@2026!segura",
      options: { captchaToken: "captcha-token" },
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      current_password: "Atual@2026!segura",
      password: "Nova@2026!segura",
    });
    expect(result).toEqual({
      outcome: "success",
      message: "Senha atualizada com segurança.",
    });
  });

  it("não atualiza a senha quando a senha atual está incorreta", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials" },
    });

    const result = await updateMyAccountPassword(
      {},
      passwordForm("Errada@2026!", "Nova@2026!segura"),
    );

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcome: "error",
      message: "A senha atual está incorreta.",
    });
  });

  it("orienta repetir a verificação quando o captcha expira", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "captcha_failed" },
    });

    const result = await updateMyAccountPassword(
      {},
      passwordForm("Atual@2026!segura", "Nova@2026!segura"),
    );

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcome: "error",
      message: "A verificação de segurança expirou. Faça a verificação novamente.",
    });
  });
});

function profileForm(displayName: string) {
  const formData = new FormData();
  formData.set("displayName", displayName);
  return formData;
}

function emailForm(email: string) {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
}

function passwordForm(currentPassword: string, password: string) {
  const formData = new FormData();
  formData.set("currentPassword", currentPassword);
  formData.set("password", password);
  formData.set("repeatPassword", password);
  formData.set("cf-turnstile-response", "captcha-token");
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
