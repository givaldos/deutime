import { describe, expect, it } from "vitest";
import { generateInviteCode } from "./prelaunch-team-invite.mjs";

describe("prelaunch team invite", () => {
  it("gera 80 bits no formato compartilhável sem caracteres ambíguos", () => {
    const code = generateInviteCode(() => Buffer.from(Array.from({ length: 16 }, (_, index) => index)));

    expect(code).toMatch(/^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/);
    expect(code).toHaveLength(19);
  });
});
