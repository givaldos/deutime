import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => mocks);

import LegacyAthleteRegistrationPage from "./page";

describe("rota legada de cadastro do atleta", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redireciona permanentemente para a rota canônica", async () => {
    await expect(
      LegacyAthleteRegistrationPage({
        params: Promise.resolve({ slug: "demo-campo" }),
        searchParams: Promise.resolve({ novo: "1" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/t/demo-campo/register?novo=1");
    expect(mocks.permanentRedirect).toHaveBeenCalledWith(
      "/t/demo-campo/register?novo=1",
    );
  });

  it("descarta parâmetros desconhecidos e rejeita slug malformado", async () => {
    await expect(
      LegacyAthleteRegistrationPage({
        params: Promise.resolve({ slug: "demo-campo" }),
        searchParams: Promise.resolve({ novo: ["1", "2"] }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/t/demo-campo/register");

    await expect(
      LegacyAthleteRegistrationPage({
        params: Promise.resolve({ slug: "demo--campo" }),
        searchParams: Promise.resolve({ novo: "1" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
