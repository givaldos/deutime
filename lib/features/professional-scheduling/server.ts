import "server-only";

import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";

export function isProfessionalSchedulingEnabled(teamId: string) {
  return confirmProfessionalSchedulingEnabled(teamId);
}

async function confirmProfessionalSchedulingEnabled(teamId: string) {
  if (await isTeamFeatureEnabled(teamId, "professional_scheduling")) {
    return true;
  }

  const enabledOnRetry = await isTeamFeatureEnabled(
    teamId,
    "professional_scheduling",
  );
  if (enabledOnRetry) {
    console.info("professional_scheduling_feature_lookup.recovered");
  }
  return enabledOnRetry;
}
