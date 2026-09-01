import { AdminEventForm } from "@/components/admin-event-form";
import { TeamAppHeader } from "@/components/team-app-header";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { isProfessionalSchedulingEnabled } from "@/lib/features/professional-scheduling/server";
import { getInternalSquadConfiguration } from "@/lib/data/internal-squads";
import { ArrowLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const user = await requireUser();
  const { teamSlug } = await params;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, timezone, default_sport_format")
      .eq("slug", teamSlug)
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) notFound();
  const [eventControlEnabled, professionalSchedulingEnabled] =
    await Promise.all([
      isTeamFeatureEnabled(team.id, "event_control"),
      isProfessionalSchedulingEnabled(team.id),
    ]);
  const internalConfiguration = professionalSchedulingEnabled
    ? await getInternalSquadConfiguration(team.id)
    : null;
  const professionalConfigurationReady = Boolean(
    internalConfiguration &&
    internalConfiguration.squads.length >= 2 &&
    internalConfiguration.defaultHomeTeamId &&
    internalConfiguration.defaultAwayTeamId &&
    internalConfiguration.defaultHomeTeamId !== internalConfiguration.defaultAwayTeamId,
  );

  return (
    <main className="app-canvas">
      <TeamAppHeader currentName={team.name} currentSlug={team.slug} teams={teams ?? []} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <Link href={`/app/${team.slug}/events`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="size-4" aria-hidden /> Voltar à agenda
        </Link>

        <div className="mt-4">
          <p className="app-kicker">Agenda do time</p>
          <h1 className="app-title mt-2">
            {professionalSchedulingEnabled ? "Novo jogo" : "Novo evento"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {professionalSchedulingEnabled
              ? "Escolha se acontece uma vez ou se repete. Cada jogo mantém sua própria chamada e escalação."
              : "Eventos semanais geram as próximas ocorrências e já abrem a chamada para o elenco ativo."}
          </p>
        </div>

        <section className="app-surface mt-6 p-5 sm:p-7">
          {professionalSchedulingEnabled && !professionalConfigurationReady ? (
            <div className="text-center">
              <h2 className="text-xl font-black text-graphite">Defina as equipes padrão</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Um owner ou admin precisa salvar ao menos duas equipes e escolher os dois lados padrão antes do primeiro jogo.
              </p>
              <Link href={`/app/${team.slug}/settings`} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-black text-white">
                Abrir ajustes do time
              </Link>
            </div>
          ) : (
            <AdminEventForm
            teamId={team.id}
            teamSlug={team.slug}
            teamTimezone={team.timezone}
            defaultSportFormat={team.default_sport_format}
            eventControlEnabled={eventControlEnabled}
            professionalSchedulingEnabled={professionalSchedulingEnabled}
            internalSquads={internalConfiguration?.squads}
            defaultHomeTeamId={internalConfiguration?.defaultHomeTeamId}
            defaultAwayTeamId={internalConfiguration?.defaultAwayTeamId}
            initialRequestId={crypto.randomUUID()}
          />
          )}
        </section>

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ListChecks className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
          Cada ocorrência recebe sua própria confirmação de presença e poderá ter uma escala diferente.
        </p>
      </div>
    </main>
  );
}
