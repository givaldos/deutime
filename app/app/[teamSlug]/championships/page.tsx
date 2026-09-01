import { CreateChampionshipForm } from "@/components/championship-forms";
import { ChampionshipCreationProgress } from "@/components/professional-creation-actions";
import { TeamAppHeader } from "@/components/team-app-header";
import { AppContainer } from "@/components/ui/app-shell";
import { getChampionships } from "@/lib/data/championships";
import { getInternalSquadConfiguration } from "@/lib/data/internal-squads";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { championshipFormatLabels } from "@/lib/features/championships/rules";
import { isProfessionalSchedulingEnabled } from "@/lib/features/professional-scheduling/server";
import { ArrowLeft, ChevronRight, LockKeyhole, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusLabels = {
  draft: "Rascunho",
  published: "Publicado",
  active: "Em andamento",
  completed: "Encerrado",
  archived: "Arquivado",
};

export default async function ChampionshipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser();
  const [{ teamSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase.from("teams").select("id, name, slug").eq("slug", teamSlug).maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();
  const [
    { data: membership },
    championships,
    professionalSchedulingEnabled,
  ] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    getChampionships(team.id),
    isProfessionalSchedulingEnabled(team.id),
  ]);
  if (!membership || championships === null) notFound();
  const canConfigure = membership.role === "owner" || membership.role === "admin";
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
    <main className="app-canvas min-h-screen pb-16">
      <TeamAppHeader currentName={team.name} currentSlug={team.slug} teams={teams ?? []} />
      <AppContainer className="space-y-6 pb-12">
        <Link href={`/app/${team.slug}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="size-4" aria-hidden /> Voltar à visão geral
        </Link>

        <section className="relative overflow-hidden rounded-[2rem] bg-grass p-6 text-white shadow-float sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-emerald-300">
              <Trophy className="size-6" aria-hidden />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Competição</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Campeonatos</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
              Monte os participantes, revise cada confronto e use a súmula das partidas para atualizar a tabela.
            </p>
          </div>
        </section>

        {canConfigure &&
        professionalSchedulingEnabled &&
        query.new === "1" ? (
          <ChampionshipCreationProgress />
        ) : null}

        {canConfigure ? (
          <details
            className="app-surface group p-5 sm:p-7"
            open={
              championships.length === 0 ||
              (professionalSchedulingEnabled && query.new === "1")
            }
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-black text-graphite">
              <span className="flex items-center gap-3"><Plus className="size-5 text-emerald-700" aria-hidden /> Novo campeonato</span>
              <span className="text-xs text-slate-400 group-open:hidden">Abrir</span>
            </summary>
            <div className="mt-5 border-t border-slate-100 pt-5">
              {professionalSchedulingEnabled && !professionalConfigurationReady ? (
                <div className="text-center">
                  <p className="font-black text-graphite">Defina as equipes padrão primeiro</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Salve ao menos duas equipes internas e escolha os dois padrões antes do primeiro campeonato.
                  </p>
                  <Link href={`/app/${team.slug}/settings`} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-black text-white">
                    Abrir ajustes do time
                  </Link>
                </div>
              ) : (
                <CreateChampionshipForm
                  teamId={team.id}
                  teamSlug={team.slug}
                  professionalSchedulingEnabled={professionalSchedulingEnabled}
                  internalSquads={internalConfiguration?.squads}
                />
              )}
            </div>
          </details>
        ) : (
          <p className="app-surface flex items-start gap-3 p-4 text-sm text-slate-600">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden />
            Owner ou admin cria e publica. Você pode operar os confrontos já publicados.
          </p>
        )}

        <section aria-labelledby="championship-list-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="app-kicker">Área do time</p>
              <h2 id="championship-list-title" className="mt-1 text-xl font-black text-graphite">Competições</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{championships.length}</span>
          </div>
          {championships.length ? (
            <div className="mt-3 space-y-3">
              {championships.map((championship) => (
                <Link key={championship.id} href={`/app/${team.slug}/championships/${championship.id}`} className="app-surface flex min-h-20 items-center gap-4 p-4 transition hover:border-emerald-300">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Trophy className="size-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black text-graphite">{championship.name}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{championshipFormatLabels[championship.format]} · {statusLabels[championship.status]}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
                </Link>
              ))}
            </div>
          ) : (
            <div className="app-surface mt-3 border-dashed p-8 text-center">
              <Trophy className="mx-auto size-8 text-slate-300" aria-hidden />
              <p className="mt-3 font-black text-graphite">Nenhum campeonato ainda</p>
              <p className="mt-1 text-sm text-slate-500">O primeiro começa como rascunho privado.</p>
            </div>
          )}
        </section>
      </AppContainer>
    </main>
  );
}
