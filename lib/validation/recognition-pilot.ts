import { z } from "zod";

const teamSlugPattern = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export const recognitionPilotActionSchema = z.object({
  teamSlug: z.string().trim().regex(teamSlugPattern),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  confirmation: z.literal("confirmed"),
});
