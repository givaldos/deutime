import { TeamMoreNavigation } from "@/components/team-more-navigation";
import { AppContainer, PageHeader } from "@/components/ui/app-shell";
import { requireUser } from "@/lib/auth/dal";
import type { TeamNavigationRole } from "@/lib/navigation/team-navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TeamMorePage({
  params,
}: {
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

  if (!team) notFound();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) notFound();

  return (
    <main className="app-canvas min-h-screen pb-24">
      <AppContainer narrow>
        <Link
          href={`/app/${team.slug}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar para o início
        </Link>

        <PageHeader
          eyebrow={team.name}
          title="Mais"
          description="Acesse as outras áreas que você pode usar neste time."
        />

        <TeamMoreNavigation
          teamSlug={team.slug}
          role={membership.role as TeamNavigationRole}
        />
      </AppContainer>
    </main>
  );
}
