import { describe, expect, it } from "vitest";
import {
  isValidEmailTokenHash,
  isValidPkceAuthCode,
} from "./email-callbacks";

describe("callbacks de e-mail do Supabase", () => {
  it("aceita os formatos versionados de token hash e código PKCE", () => {
    expect(isValidEmailTokenHash("a".repeat(64))).toBe(true);
    expect(
      isValidPkceAuthCode("34e770dd-9ff9-416c-87fa-43b31d7ef225"),
    ).toBe(true);
  });

  it.each([
    undefined,
    "",
    "curto",
    "codigo com espacos e dados",
    "codigo\nLocation:/app",
    "https://exemplo.com/codigo",
  ])("rejeita capacidade inválida: %s", (value) => {
    expect(isValidEmailTokenHash(value)).toBe(false);
    expect(isValidPkceAuthCode(value)).toBe(false);
  });
});
