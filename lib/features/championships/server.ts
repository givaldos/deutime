import "server-only";

import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";

export function isChampionshipsEnabled(teamId: string) {
  return isTeamFeatureEnabled(teamId, "championships");
}
