import "server-only";

import {
  canConsumeExternalCommands,
  canProduceExternalCommands,
  failClosedLookup,
  type FeatureKey,
  type RuntimeControlKey,
} from "./capabilities";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";

export async function isTeamFeatureEnabled(
  teamId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const supabase = await createClient();

  return failClosedLookup(feature, async (requestedFeature) => {
    const { data, error } = await supabase.rpc("is_team_feature_enabled", {
      requested_team_id: teamId,
      requested_feature: requestedFeature,
    });

    return !error && data === true;
  });
}

async function lookupRuntimeControl(
  control: RuntimeControlKey,
): Promise<boolean> {
  const supabase = createPrivilegedClient();
  const { data, error } = await supabase.rpc("is_runtime_control_enabled", {
    requested_control: control,
  });

  return !error && data === true;
}

export function isExternalCommandProductionEnabled() {
  return canProduceExternalCommands(lookupRuntimeControl);
}

export function isExternalCommandConsumptionEnabled(timeoutMs?: number) {
  return canConsumeExternalCommands(lookupRuntimeControl, timeoutMs);
}
