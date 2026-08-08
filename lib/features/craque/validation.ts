import { z } from "zod";
import { TEAM_SLUG_PATTERN } from "@/lib/validation/onboarding";

export const craqueVoteSchema = z.object({
  matchId: z.string().uuid(),
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  candidateAthleteId: z.string().uuid(),
});
