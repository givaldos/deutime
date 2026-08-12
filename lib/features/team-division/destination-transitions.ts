export const UNASSIGNED_DESTINATION = "unassigned";
export const EXCLUDED_DESTINATION = "excluded";

export function nextTouchDestination({
  athleteId,
  athleteIds,
  squadIds,
  destinations,
}: {
  athleteId: string;
  athleteIds: string[];
  squadIds: string[];
  destinations: Record<string, string>;
}) {
  const currentSquadIndex = squadIds.indexOf(destinations[athleteId] ?? "");
  if (currentSquadIndex >= 0) {
    return squadIds[(currentSquadIndex + 1) % squadIds.length]
      ?? UNASSIGNED_DESTINATION;
  }

  return squadIds.reduce<string | null>((leastPopulated, squadId) => {
    if (!leastPopulated) return squadId;
    const squadCount = athleteIds.filter(
      (candidateId) => destinations[candidateId] === squadId,
    ).length;
    const leastPopulatedCount = athleteIds.filter(
      (candidateId) => destinations[candidateId] === leastPopulated,
    ).length;
    return squadCount < leastPopulatedCount ? squadId : leastPopulated;
  }, null) ?? UNASSIGNED_DESTINATION;
}

export function excludeAthleteFromLineup(
  destinations: Record<string, string>,
  athleteId: string,
) {
  return { ...destinations, [athleteId]: EXCLUDED_DESTINATION };
}
