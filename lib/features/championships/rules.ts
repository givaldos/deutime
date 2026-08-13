export const championshipTiebreakKeys = [
  "wins",
  "goal_difference",
  "goals_for",
  "head_to_head",
] as const;

export type ChampionshipTiebreakKey =
  (typeof championshipTiebreakKeys)[number];

export const championshipTiebreakLabels: Record<
  ChampionshipTiebreakKey,
  string
> = {
  wins: "Vitórias",
  goal_difference: "Saldo de gols",
  goals_for: "Gols pró",
  head_to_head: "Confronto direto",
};

export function expectedLeagueFixtureCount(participantCount: number) {
  if (!Number.isInteger(participantCount) || participantCount < 2) return 0;
  return (participantCount * (participantCount - 1)) / 2;
}

export function expectedLeagueRoundCount(participantCount: number) {
  if (!Number.isInteger(participantCount) || participantCount < 2) return 0;
  return participantCount % 2 === 0 ? participantCount - 1 : participantCount;
}

export function describeLeagueProgress(
  participantCount: number,
  finalizedFixtureCount: number,
) {
  const total = expectedLeagueFixtureCount(participantCount);
  const finalized = Math.max(0, Math.min(finalizedFixtureCount, total));
  return { finalized, total, complete: total > 0 && finalized === total };
}
