import { describe, expect, it } from "vitest";
import { suggestAutomaticDestinations } from "./automatic";

const squads = [{ id: "verde" }, { id: "azul" }];
const athletes = [
  { id: "goleiro-1", isGoalkeeper: true },
  { id: "goleiro-2", isGoalkeeper: true },
  { id: "linha-1", isGoalkeeper: false },
  { id: "linha-2", isGoalkeeper: false },
  { id: "linha-3", isGoalkeeper: false },
];

describe("sugestão automática de times", () => {
  it("é reproduzível para o mesmo evento", () => {
    const first = suggestAutomaticDestinations("evento-a", squads, athletes);
    const second = suggestAutomaticDestinations("evento-a", squads, [...athletes].reverse());
    expect(second).toEqual(first);
  });

  it("espalha goleiros e mantém diferença máxima de uma pessoa", () => {
    const suggestion = suggestAutomaticDestinations("evento-a", squads, athletes);
    expect(suggestion["goleiro-1"]).not.toBe(suggestion["goleiro-2"]);
    const counts = squads.map(
      (squad) => Object.values(suggestion).filter((id) => id === squad.id).length,
    );
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("usa o evento como semente sem alterar elegibilidade", () => {
    const first = suggestAutomaticDestinations("evento-a", squads, athletes);
    const second = suggestAutomaticDestinations("evento-b", squads, athletes);
    expect(Object.keys(second).sort()).toEqual(Object.keys(first).sort());
    expect(second).not.toEqual(first);
  });

  it("falha fechado sem ao menos dois times", () => {
    expect(suggestAutomaticDestinations("evento", [{ id: "único" }], athletes)).toEqual({});
  });
});
