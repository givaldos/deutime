import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionDestination: vi.fn(),
  redirect: vi.fn((destination: string) => { throw new Error(`REDIRECT:${destination}`); }),
}));

vi.mock("@/lib/auth/dal", () => ({ getSessionDestination: mocks.getSessionDestination }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import Home from "./page";

describe("home pública", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("oferece acesso anônimo e informa a exigência de convite antes do cadastro", async () => {
    mocks.getSessionDestination.mockResolvedValue(null);
    const html = renderToStaticMarkup(await Home());
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(html).toContain('href="/auth/sign-up"');
    expect(html).toContain('href="/auth/login"');
    expect(html).toContain("Acesso por convite para criar novos times.");
    expect(html).toContain("Demonstração ilustrativa com dados fictícios.");
  });

  it.each(["/app", "/me"])("preserva o destino verificado da sessão: %s", async (destination) => {
    mocks.getSessionDestination.mockResolvedValue(destination);
    await expect(Home()).rejects.toThrow(`REDIRECT:${destination}`);
    expect(mocks.redirect).toHaveBeenCalledWith(destination);
  });

  it("não oculta falha da verificação da sessão", async () => {
    mocks.getSessionDestination.mockRejectedValue(new Error("Falha de verificação"));
    await expect(Home()).rejects.toThrow("Falha de verificação");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
