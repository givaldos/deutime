import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseEventSharePilotConfig } from "./pilot-config";

describe("configuração do piloto do cartão público", () => {
  it("permanece inerte quando a coorte não foi configurada", () => {
    expect(parseEventSharePilotConfig({})).toBeNull();
  });

  it("aceita somente um UUID canônico para a coorte", () => {
    expect(
      parseEventSharePilotConfig({
        EVENT_SHARE_PILOT_TEAM_ID:
          "a8100000-0000-4000-8000-000000000001",
      }),
    ).toEqual({ teamId: "a8100000-0000-4000-8000-000000000001" });
  });

  it("falha fechado quando a configuração é inválida", () => {
    expect(() =>
      parseEventSharePilotConfig({
        EVENT_SHARE_PILOT_TEAM_ID: "demo-campo",
      }),
    ).toThrow("Configuração do piloto do cartão público inválida.");
  });
});
