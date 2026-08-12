import { describe, expect, it } from "vitest";
import {
  EXCLUDED_DESTINATION,
  UNASSIGNED_DESTINATION,
  excludeAthleteFromLineup,
  nextTouchDestination,
} from "./destination-transitions";

const athleteIds = ["ana", "bia", "carol"];
const squadIds = ["azul", "branco"];

describe("transições da divisão por toque", () => {
  it("coloca quem está sem time no time menos populoso", () => {
    expect(nextTouchDestination({
      athleteId: "carol",
      athleteIds,
      squadIds,
      destinations: { ana: "azul", bia: "azul", carol: UNASSIGNED_DESTINATION },
    })).toBe("branco");
  });

  it("move quem já está escalado para o próximo time", () => {
    expect(nextTouchDestination({
      athleteId: "ana",
      athleteIds,
      squadIds,
      destinations: { ana: "azul", bia: "branco", carol: "azul" },
    })).toBe("branco");
  });

  it("retira sem alterar o restante da divisão", () => {
    expect(excludeAthleteFromLineup(
      { ana: "azul", bia: "branco" },
      "ana",
    )).toEqual({ ana: EXCLUDED_DESTINATION, bia: "branco" });
  });

  it("recoloca quem estava fora no time menos populoso", () => {
    expect(nextTouchDestination({
      athleteId: "ana",
      athleteIds,
      squadIds,
      destinations: { ana: EXCLUDED_DESTINATION, bia: "azul", carol: "azul" },
    })).toBe("branco");
  });

  it("mantém sem time quando não há equipe disponível", () => {
    expect(nextTouchDestination({
      athleteId: "ana",
      athleteIds: ["ana"],
      squadIds: [],
      destinations: { ana: UNASSIGNED_DESTINATION },
    })).toBe(UNASSIGNED_DESTINATION);
  });
});
