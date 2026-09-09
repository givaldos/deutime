import { TeamAppHeader } from "@/components/team-app-header";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { requireUser } from "@/lib/auth/dal";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}) {
  const user = await requireUser();
  const { teamSlug } = await params;
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, slug")
    .eq("slug", teamSlug)
    .maybeSingle();

  if (!team) return children;

  const [{ data: membership }, { data: teams }] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);

  if (!membership) return children;

  const navigationEnabled = await isTeamFeatureEnabled(team.id, "team_navigation_shell");
  if (!navigationEnabled) return children;

  const [{ data: logo }, championshipsEnabled] = await Promise.all([
    supabase
      .from("team_media")
      .select("storage_path")
      .eq("team_id", team.id)
      .eq("kind", "logo")
      .maybeSingle(),
    isTeamFeatureEnabled(team.id, "championships"),
  ]);
  const { data: signedLogo } = logo?.storage_path
    ? await supabase.storage.from("team_media").createSignedUrl(logo.storage_path, 3600)
    : { data: null };

  return (
    <div className="[&_.legacy-team-bottom-nav]:hidden [&_.legacy-team-header]:hidden">
      <TeamAppHeader
        currentName={team.name}
        currentSlug={team.slug}
        teams={teams ?? []}
        role={membership.role}
        championshipsEnabled={championshipsEnabled}
        logoUrl={signedLogo?.signedUrl ?? null}
      />
      {children}
      <TeamBottomNav
        teamSlug={team.slug}
        role={membership.role}
        championshipsEnabled={championshipsEnabled}
      />
    </div>
  );
}
