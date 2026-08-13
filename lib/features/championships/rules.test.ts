import { describe, expect, it } from "vitest";
import {
  describeLeagueProgress,
  expectedLeagueFixtureCount,
  expectedLeagueRoundCount,
} from "./rules";

describe("regras de apresentação de pontos corridos", () => {
  it.each([
    [2, 1, 1],
    [3, 3, 3],
    [4, 6, 3],
    [32, 496, 31],
  ])("calcula grade para %i participantes", (participants, fixtures, rounds) => {
    expect(expectedLeagueFixtureCount(participants)).toBe(fixtures);
    expect(expectedLeagueRoundCount(participants)).toBe(rounds);
  });

  it("falha fechado para quantidades ainda inválidas", () => {
    expect(expectedLeagueFixtureCount(1)).toBe(0);
    expect(expectedLeagueRoundCount(Number.NaN)).toBe(0);
  });

  it("limita o progresso visual sem alterar a fonte esportiva", () => {
    expect(describeLeagueProgress(4, 9)).toEqual({
      finalized: 6,
      total: 6,
      complete: true,
    });
  });
});
