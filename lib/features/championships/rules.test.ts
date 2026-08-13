import { describe, expect, it } from "vitest";
import {
  describeLeagueProgress,
  expectedGroupFixtureCount,
  expectedKnockoutFixtureCount,
  expectedKnockoutRoundCount,
  expectedLeagueFixtureCount,
  expectedLeagueRoundCount,
  nextBracketSize,
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

describe("chave eliminatória", () => {
  it.each([
    [2, 2, 1, 1],
    [5, 8, 7, 3],
    [16, 16, 15, 4],
  ])(
    "%i participantes ocupam chave %i com %i jogos em %i fases",
    (participants, size, fixtures, rounds) => {
      expect(nextBracketSize(participants)).toBe(size);
      expect(expectedKnockoutFixtureCount(participants)).toBe(fixtures);
      expect(expectedKnockoutRoundCount(participants)).toBe(rounds);
    },
  );

  it("soma confrontos independentes da fase de grupos", () => {
    expect(expectedGroupFixtureCount([3, 3])).toBe(6);
    expect(expectedGroupFixtureCount([4, 4])).toBe(12);
    expect(expectedGroupFixtureCount([2])).toBe(0);
  });
});
