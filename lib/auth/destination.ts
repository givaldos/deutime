export type DashboardDestination = "/app" | "/me";

type DestinationLookupResult = {
  exists: boolean;
  failed: boolean;
};

export function resolveDashboardDestination({
  hasActiveTeamMembership,
  hasPlayerProfile,
}: {
  hasActiveTeamMembership: boolean;
  hasPlayerProfile: boolean;
}): DashboardDestination {
  if (hasActiveTeamMembership) return "/app";
  if (hasPlayerProfile) return "/me";

  // Authenticated administrator accounts without a team still need the PLG
  // onboarding and invitation inbox available at /app.
  return "/app";
}

export async function resolveDashboardDestinationFromLookups({
  lookupActiveTeamMembership,
  lookupPlayerProfile,
  reportFailure,
}: {
  lookupActiveTeamMembership: () => Promise<DestinationLookupResult>;
  lookupPlayerProfile: () => Promise<DestinationLookupResult>;
  reportFailure: (lookup: "team_membership" | "player_profile") => void;
}): Promise<DashboardDestination> {
  let membership: DestinationLookupResult;

  try {
    membership = await lookupActiveTeamMembership();
  } catch {
    reportFailure("team_membership");
    return "/app";
  }

  if (membership.failed) {
    reportFailure("team_membership");
    return "/app";
  }

  if (membership.exists) return "/app";

  let playerProfile: DestinationLookupResult;

  try {
    playerProfile = await lookupPlayerProfile();
  } catch {
    reportFailure("player_profile");
    return "/app";
  }

  if (playerProfile.failed) {
    reportFailure("player_profile");
    return "/app";
  }

  return resolveDashboardDestination({
    hasActiveTeamMembership: false,
    hasPlayerProfile: playerProfile.exists,
  });
}
