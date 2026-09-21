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
  stage?: string | string[];
  group?: string | string[];
  round?: string | string[];
  view?: string | string[];
  cursor?: string | string[];
  fixture?: string | string[];
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

export function safeChampionshipFollowupReturnTo(
  teamSlug: string,
  value: string | string[] | undefined,
) {
  if (!value || Array.isArray(value)) return null;
  try {
    const parsed = new URL(value, "https://deutime.invalid");
    const escapedSlug = teamSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      parsed.origin !== "https://deutime.invalid" ||
      !new RegExp(`^/app/${escapedSlug}/championships/[0-9a-f-]{36}$`, "i").test(parsed.pathname) ||
      parsed.hash ||
      parsed.searchParams.get("section") !== "matches" ||
      parsed.searchParams.has("returnTo")
    ) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function buildChampionshipFollowupUrl({
  teamSlug,
  championshipId,
  section,
  returnTo,
  extras,
}: {
  teamSlug: string;
  championshipId: string;
  section: ChampionshipFollowupSection;
  returnTo?: string | null;
  extras?: Record<string, string | number | null | undefined>;
}) {
  const params = new URLSearchParams();
  if (section !== "summary") params.set("section", section);
  if (returnTo) params.set("returnTo", returnTo);
  for (const [key, value] of Object.entries(extras ?? {})) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return `/app/${teamSlug}/championships/${championshipId}${query ? `?${query}` : ""}`;
}
