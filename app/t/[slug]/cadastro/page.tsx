import { teamRegistrationPath } from "@/lib/public/team-registration";
import { TEAM_SLUG_PATTERN } from "@/lib/validation/onboarding";
import { notFound, permanentRedirect } from "next/navigation";

export default async function LegacyAthleteRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ novo?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!TEAM_SLUG_PATTERN.test(slug)) notFound();

  permanentRedirect(teamRegistrationPath(slug, query.novo === "1"));
}
