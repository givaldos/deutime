import "server-only";

import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";

export function isChampionshipsEnabled(teamId: string) {
  return confirmChampionshipsEnabled(teamId);
}

async function confirmChampionshipsEnabled(teamId: string) {
  if (await isTeamFeatureEnabled(teamId, "championships")) return true;

  const enabledOnRetry = await isTeamFeatureEnabled(teamId, "championships");
  if (enabledOnRetry) {
    console.info("championship_feature_lookup.recovered");
  }
  return enabledOnRetry;
}
