import { describe, expect, it } from "vitest";

import { buildVisualFormationRows } from "./visual-formation";

describe("formação visual pública", () => {
  it("mantém o primeiro atleta isolado e distribui os demais em linhas", () => {
    expect(buildVisualFormationRows(["A", "B", "C", "D", "E", "F", "G"])).toEqual([
      ["E", "F", "G"],
      ["B", "C", "D"],
      ["A"],
    ]);
  });

  it("preserva vazio e time com uma pessoa sem inventar posições", () => {
    expect(buildVisualFormationRows([])).toEqual([]);
    expect(buildVisualFormationRows(["A"])).toEqual([["A"]]);
  });
});
