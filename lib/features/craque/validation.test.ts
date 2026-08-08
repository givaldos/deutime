import { describe, expect, it } from "vitest";
import { craqueVoteSchema } from "./validation";

const validVote = {
  matchId: "05400000-0000-4000-8000-000000000001",
  teamSlug: "craque-a",
  candidateAthleteId: "05200000-0000-4000-8000-000000000001",
};

describe("craqueVoteSchema", () => {
  it("aceita apenas IDs e slug canônicos", () => {
    expect(craqueVoteSchema.safeParse(validVote).success).toBe(true);
  });

  it("rejeita candidato inválido e slug fora do contrato", () => {
    expect(
      craqueVoteSchema.safeParse({
        ...validVote,
        candidateAthleteId: "não-é-uuid",
        teamSlug: "A",
      }).success,
    ).toBe(false);
  });
});
