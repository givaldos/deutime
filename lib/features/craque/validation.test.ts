import { describe, expect, it } from "vitest";
import { craqueReceiptTokenSchema, craqueVoteSchema } from "./validation";

const validVote = {
  matchId: "05400000-0000-4000-8000-000000000001",
  eventId: "05300000-0000-4000-8000-000000000001",
  candidateAthleteId: "05200000-0000-4000-8000-000000000001",
};

describe("craqueVoteSchema", () => {
  it("aceita somente os três IDs públicos da jornada", () => {
    expect(craqueVoteSchema.safeParse(validVote).success).toBe(true);
  });

  it("rejeita candidato ou evento inválido", () => {
    expect(
      craqueVoteSchema.safeParse({
        ...validVote,
        candidateAthleteId: "não-é-uuid",
        eventId: "outro-evento",
      }).success,
    ).toBe(false);
  });

  it("aceita somente recibo hexadecimal de 256 bits", () => {
    expect(craqueReceiptTokenSchema.safeParse("a".repeat(64)).success).toBe(
      true,
    );
    expect(craqueReceiptTokenSchema.safeParse("A".repeat(64)).success).toBe(
      false,
    );
    expect(craqueReceiptTokenSchema.safeParse("a".repeat(63)).success).toBe(
      false,
    );
  });
});
