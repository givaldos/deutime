import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyTurnstileToken: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: mocks.verifyTurnstileToken,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

import { prepareAthleteRegistration } from "./actions";

function registrationForm(token?: string) {
  const form = new FormData();
  form.set("teamSlug", "demo-campo");
  form.set("fullName", "Atleta Teste");
  form.set("preferredName", "");
  form.set("birthDate", "");
  form.set("phone", "11999999999");
  form.set("acceptsPrivacy", "on");
  form.set("positionCodes", "GOL");
  form.set("website", "");
  if (token) form.set("cf-turnstile-response", token);
  return form;
}

describe("prepareAthleteRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue({ get: () => null });
    mocks.verifyTurnstileToken.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fecha o cadastro em produção sem configuração anti-bot", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await prepareAthleteRegistration(registrationForm());

    expect(result).toEqual({
      ok: false,
      message: "Cadastro temporariamente indisponível. Tente novamente mais tarde.",
    });
    expect(mocks.verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it("exige o token quando há configuração em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");

    const result = await prepareAthleteRegistration(registrationForm());

    expect(result.ok).toBe(false);
    expect(mocks.verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it("valida o token e libera quando a verificação passa", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");

    const result = await prepareAthleteRegistration(registrationForm("token-123"));

    expect(result).toEqual({ ok: true, phone: "+5511999999999" });
    expect(mocks.verifyTurnstileToken).toHaveBeenCalledOnce();
  });

  it("mantém o desenvolvimento local sem anti-bot", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await prepareAthleteRegistration(registrationForm());

    expect(result.ok).toBe(true);
  });
});
