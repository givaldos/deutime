export type AutomaticSquad = { id: string };

export type AutomaticAthlete = {
  id: string;
  isGoalkeeper: boolean;
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function orderForEvent(eventId: string, athletes: AutomaticAthlete[]) {
  return [...athletes].sort((left, right) => {
    const hashDifference =
      stableHash(`${eventId}:${left.id}`) - stableHash(`${eventId}:${right.id}`);
    return hashDifference || left.id.localeCompare(right.id);
  });
}

/**
 * Sugere uma divisão explicável: espalha goleiros primeiro e sempre envia a
 * próxima pessoa ao time com menos atletas. Não persiste nem atribui nota.
 */
export function suggestAutomaticDestinations(
  eventId: string,
  squads: AutomaticSquad[],
  athletes: AutomaticAthlete[],
) {
  if (squads.length < 2) return {};

  const destinations: Record<string, string> = {};
  const counts = new Map(squads.map((squad) => [squad.id, 0]));
  const ordered = [
    ...orderForEvent(eventId, athletes.filter((athlete) => athlete.isGoalkeeper)),
    ...orderForEvent(eventId, athletes.filter((athlete) => !athlete.isGoalkeeper)),
  ];

  for (const athlete of ordered) {
    const target = squads.reduce((best, candidate) => {
      const candidateCount = counts.get(candidate.id) ?? 0;
      const bestCount = counts.get(best.id) ?? 0;
      return candidateCount < bestCount ? candidate : best;
    });
    destinations[athlete.id] = target.id;
    counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
  }

  return destinations;
}
