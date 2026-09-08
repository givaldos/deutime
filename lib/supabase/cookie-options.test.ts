import { describe, expect, it, vi } from "vitest";

describe("getAuthCookieOptions", () => {
  it("liga o flag secure quando a URL pública usa https", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://projeto.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-1234567890");

    const { getAuthCookieOptions } = await import("./cookie-options");

    expect(getAuthCookieOptions()).toMatchObject({
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    vi.unstubAllEnvs();
  });

  it("desliga o flag secure no desenvolvimento local em http", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-1234567890");

    const { getAuthCookieOptions } = await import("./cookie-options");

    expect(getAuthCookieOptions()).toMatchObject({ secure: false });
    vi.unstubAllEnvs();
  });
});
