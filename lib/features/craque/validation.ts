import { z } from "zod";

export const craqueVoteSchema = z.object({
  matchId: z.string().uuid(),
  teamSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/),
  candidateAthleteId: z.string().uuid(),
});
