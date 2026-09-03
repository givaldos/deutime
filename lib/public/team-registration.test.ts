import {
  buildTeamRegistrationShareText,
  buildTeamRegistrationWhatsAppUrl,
  teamRegistrationPath,
} from "./team-registration";
import { describe, expect, it } from "vitest";

describe("cadastro público do time", () => {
  it("gera somente a rota canônica em inglês", () => {
    expect(teamRegistrationPath("demo-campo")).toBe(
      "/t/demo-campo/register",
    );
    expect(teamRegistrationPath("demo-campo", true)).toBe(
      "/t/demo-campo/register?novo=1",
    );
    expect(() => teamRegistrationPath("demo--campo")).toThrow(
      "Slug público inválido.",
    );
    expect(() => teamRegistrationPath("ab")).toThrow("Slug público inválido.");
    expect(() => teamRegistrationPath("a".repeat(49))).toThrow(
      "Slug público inválido.",
    );
  });

  it("prepara o compartilhamento sem emoji ou caractere substituído", () => {
    const url = "https://deutime.app/t/demo-campo/register";
    const text = buildTeamRegistrationShareText("Demo Campo", url);

    expect(text).toBe(
      `Venha jogar com o Demo Campo! Entre com seu celular ou crie seu perfil: ${url}`,
    );
    expect(text).not.toMatch(/[⚽�]/u);
    expect(decodeURIComponent(buildTeamRegistrationWhatsAppUrl("Demo Campo", url))).toContain(text);
  });
});
