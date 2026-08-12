import "server-only";

import { z } from "zod";

const eventSharePilotConfigSchema = z.object({
  EVENT_SHARE_PILOT_TEAM_ID: z.string().uuid(),
});

export function parseEventSharePilotConfig(
  env: Record<string, string | undefined>,
): { teamId: string } | null {
  if (!env.EVENT_SHARE_PILOT_TEAM_ID?.trim()) return null;

  const parsed = eventSharePilotConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Configuração do piloto do cartão público inválida.");
  }

  return { teamId: parsed.data.EVENT_SHARE_PILOT_TEAM_ID };
}
