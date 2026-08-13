import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseChampionshipPilotConfig } from "./pilot-config";

describe("configuração do piloto de campeonatos", () => {
  it("permanece inerte sem coorte configurada", () => {
    expect(parseChampionshipPilotConfig({})).toBeNull();
  });

  it("aceita somente um UUID para a coorte", () => {
    expect(parseChampionshipPilotConfig({
      CHAMPIONSHIP_PILOT_TEAM_ID:
        "10000000-0000-0000-0000-000000000001",
    })).toEqual({ teamId: "10000000-0000-0000-0000-000000000001" });
  });

  it("falha fechado com configuração inválida", () => {
    expect(() => parseChampionshipPilotConfig({
      CHAMPIONSHIP_PILOT_TEAM_ID: "demo-campo",
    })).toThrow("Configuração do piloto de campeonatos inválida.");
  });
});
