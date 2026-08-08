import { z } from "zod";

export const craqueVoteSchema = z.object({
  matchId: z.string().uuid(),
  eventId: z.string().uuid(),
  candidateAthleteId: z.string().uuid(),
});

export const craqueReceiptTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);
