import "server-only";

import { z } from "zod";

const championshipPilotConfigSchema = z.object({
  CHAMPIONSHIP_PILOT_TEAM_ID: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
});

export function parseChampionshipPilotConfig(
  env: Record<string, string | undefined>,
): { teamId: string } | null {
  if (!env.CHAMPIONSHIP_PILOT_TEAM_ID?.trim()) return null;

  const parsed = championshipPilotConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Configuração do piloto de campeonatos inválida.");
  }
  return { teamId: parsed.data.CHAMPIONSHIP_PILOT_TEAM_ID };
}
