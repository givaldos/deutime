import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseProfessionalSchedulingPilotConfig } from "./pilot-config";

describe("configuração do piloto da agenda profissional", () => {
  it("permanece inerte sem coorte", () => {
    expect(parseProfessionalSchedulingPilotConfig({})).toBeNull();
  });

  it("aceita somente UUID canônico", () => {
    expect(parseProfessionalSchedulingPilotConfig({
      R13_PILOT_TEAM_ID: "f2200000-0000-4000-8000-000000000001",
    })).toEqual({ teamId: "f2200000-0000-4000-8000-000000000001" });
    expect(() => parseProfessionalSchedulingPilotConfig({
      R13_PILOT_TEAM_ID: "demo-campo",
    })).toThrow("Configuração do piloto da agenda profissional inválida");
  });
});
