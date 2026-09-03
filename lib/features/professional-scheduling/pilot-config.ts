import "server-only";

import { z } from "zod";

const professionalSchedulingPilotConfigSchema = z.object({
  R13_PILOT_TEAM_ID: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
});

export function parseProfessionalSchedulingPilotConfig(
  env: Record<string, string | undefined>,
): { teamId: string } | null {
  if (!env.R13_PILOT_TEAM_ID?.trim()) return null;

  const parsed = professionalSchedulingPilotConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Configuração do piloto da agenda profissional inválida.");
  }
  return { teamId: parsed.data.R13_PILOT_TEAM_ID };
}
