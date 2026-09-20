export const championshipFollowupSections = [
  "summary",
  "matches",
  "standings",
  "teams",
  "regulation",
] as const;

export type ChampionshipFollowupSection =
  (typeof championshipFollowupSections)[number];

export type RawChampionshipFollowupSearchParams = {
  section?: string | string[];
  returnTo?: string | string[];
};

export function parseChampionshipFollowupSection(
  value: string | string[] | undefined,
): ChampionshipFollowupSection {
  if (typeof value !== "string") return "summary";
  return championshipFollowupSections.includes(
    value as ChampionshipFollowupSection,
  )
    ? (value as ChampionshipFollowupSection)
    : "summary";
}

export function buildChampionshipFollowupUrl({
  teamSlug,
  championshipId,
  section,
  returnTo,
}: {
  teamSlug: string;
  championshipId: string;
  section: ChampionshipFollowupSection;
  returnTo?: string | null;
}) {
  const params = new URLSearchParams();
  if (section !== "summary") params.set("section", section);
  if (returnTo) params.set("returnTo", returnTo);
  const query = params.toString();
  return `/app/${teamSlug}/championships/${championshipId}${query ? `?${query}` : ""}`;
}
