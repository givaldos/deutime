import {
  resolveEventScheduleConflict,
  transitionEventSchedule,
} from "@/app/app/[teamSlug]/events/actions";
import { TeamAppHeader } from "@/components/team-app-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const conflictLabels = {
  internal_team_overlap: "A mesma equipe interna está em dois jogos no mesmo horário.",
  exclusive_venue_overlap: "O local exclusivo já está reservado neste horário.",
  duplicate_fixture: "Esta partida já existe na competição.",
  short_interval: "A mesma equipe tem menos de 60 minutos entre os jogos.",
  travel_buffer: "Há menos de 90 minutos para o deslocamento entre locais.",
  athlete_overlap: "Há atleta confirmado em dois jogos simultâneos.",
};

const stateLabels = {
  scheduled: "Confirmado",
  pending_review: "Revisão necessária",
  date_tbd: "Data a definir",
  postponed: "Adiado",
};

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export default async function PendingSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { teamSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, timezone")
      .eq("slug", teamSlug)
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();

  const [{ data: membership }, professionalEnabled] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    isTeamFeatureEnabled(team.id, "professional_scheduling"),
  ]);
  if (!membership || !professionalEnabled) notFound();

  const [{ data: conflicts }, { data: events }] = await Promise.all([
    supabase
      .from("event_schedule_conflicts")
      .select("id, event_id, other_event_id, kind, severity, details")
      .eq("team_id", team.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("events")
      .select(
        "id, series_id, title, starts_at, venue_id, professional_schedule_state, status",
      )
      .eq("team_id", team.id)
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(100),
  ]);

  const eventById = new Map((events ?? []).map((event) => [event.id, event]));
  const venueIds = [
    ...new Set((events ?? []).flatMap((event) => (event.venue_id ? [event.venue_id] : []))),
  ];
  const { data: venues } = venueIds.length
    ? await supabase.from("venues").select("id, name").in("id", venueIds)
    : { data: [] };
  const venueById = new Map((venues ?? []).map((venue) => [venue.id, venue.name]));
  const canAcceptHardConflict = ["owner", "admin"].includes(membership.role);

  return (
    <main className="app-canvas min-h-screen pb-16">
      <TeamAppHeader currentName={team.name} currentSlug={team.slug} teams={teams ?? []} />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={`/app/${team.slug}/events`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar à agenda
        </Link>

        <header className="mt-4">
          <p className="app-kicker">Agenda profissional</p>
          <h1 className="app-title mt-2">Pendências e decisões</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Resolva bloqueios antes de confirmar a agenda. Alertas podem ser
            reconhecidos pela gestão; exceções duras exigem owner ou admin.
          </p>
        </header>

        {query.resolved === "1" || query.transitioned === "1" ? (
          <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="size-5" aria-hidden /> Decisão registrada com sucesso.
          </p>
        ) : null}
        {query.error ? (
          <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">
            Não foi possível registrar a decisão. Atualize a página e tente novamente.
          </p>
        ) : null}

        <section className="mt-7">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-700" aria-hidden />
            <h2 className="text-lg font-black text-graphite">Conflitos abertos</h2>
          </div>
          {conflicts?.length ? (
            <div className="mt-3 grid gap-4">
              {conflicts.map((conflict) => {
                const event = eventById.get(conflict.event_id);
                const other = eventById.get(conflict.other_event_id);
                if (!event) return null;
                const isHard = conflict.severity === "hard";
                return (
                  <article key={conflict.id} className="app-surface p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${isHard ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                        <AlertTriangle className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-black uppercase tracking-wide ${isHard ? "text-red-700" : "text-amber-800"}`}>
                          {isHard ? "Bloqueio" : "Alerta"}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-graphite">{event.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {conflictLabels[conflict.kind]}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDate(event.starts_at, team.timezone)}
                          {other ? ` · também afeta ${other.title}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Button asChild variant="outline" className="min-h-12">
                        <Link href={`/app/${team.slug}/events/${event.id}/edit`}>
                          Remarcar ou corrigir
                        </Link>
                      </Button>
                      {!isHard ? (
                        <form action={resolveEventScheduleConflict}>
                          <input type="hidden" name="teamId" value={team.id} />
                          <input type="hidden" name="teamSlug" value={team.slug} />
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="conflictId" value={conflict.id} />
                          <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                          <input type="hidden" name="decision" value="confirm_warning" />
                          <Button type="submit" className="min-h-12 w-full">Reconhecer alerta</Button>
                        </form>
                      ) : canAcceptHardConflict ? (
                        <details className="rounded-2xl border border-red-200 bg-red-50 p-3 sm:col-span-2">
                          <summary className="min-h-11 cursor-pointer py-2 text-sm font-black text-red-900">
                            Autorizar exceção com justificativa
                          </summary>
                          <form action={resolveEventScheduleConflict} className="mt-3 space-y-3">
                            <input type="hidden" name="teamId" value={team.id} />
                            <input type="hidden" name="teamSlug" value={team.slug} />
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="conflictId" value={conflict.id} />
                            <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                            <input type="hidden" name="decision" value="accept_exception" />
                            <label className="block text-xs font-bold text-red-950">
                              Justificativa operacional
                              <textarea
                                name="justification"
                                required
                                minLength={10}
                                maxLength={500}
                                className="mt-1 min-h-24 w-full rounded-xl border border-red-200 bg-white p-3 text-base text-graphite"
                              />
                            </label>
                            <Button type="submit" variant="destructive" className="min-h-12 w-full">
                              Confirmar exceção
                            </Button>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="app-surface mt-3 border-dashed p-7 text-center">
              <CheckCircle2 className="mx-auto size-8 text-emerald-700" aria-hidden />
              <p className="mt-3 font-black text-graphite">Nenhum conflito aberto</p>
              <p className="mt-1 text-sm text-slate-500">A agenda não tem revisões pendentes.</p>
            </div>
          )}
        </section>

        <section className="mt-9">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-emerald-700" aria-hidden />
            <h2 className="text-lg font-black text-graphite">Gerenciar próximos jogos</h2>
          </div>
          <div className="mt-3 grid gap-3">
            {(events ?? []).map((event) => (
              <details key={event.id} className="app-surface overflow-hidden">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4 marker:content-none sm:p-5">
                  <span className="min-w-0">
                    <span className="block truncate font-black text-graphite">{event.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatDate(event.starts_at, team.timezone)} · {stateLabels[event.professional_schedule_state]}
                    </span>
                  </span>
                  {event.venue_id ? (
                    <span className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                      <MapPin className="size-3.5" aria-hidden /> {venueById.get(event.venue_id)}
                    </span>
                  ) : null}
                </summary>
                <form action={transitionEventSchedule} className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 sm:p-5">
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="teamSlug" value={team.slug} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                  <label className="text-xs font-bold text-slate-700">
                    Decisão
                    <select name="transition" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base" defaultValue="date_tbd">
                      <option value="date_tbd">Deixar data a definir</option>
                      <option value="postpone">Adiar</option>
                      <option value="cancel">Cancelar</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Aplicar em
                    <select name="scope" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base" defaultValue="single_event">
                      <option value="single_event">Somente este jogo</option>
                      {event.series_id ? <option value="this_and_future">Este e os próximos</option> : null}
                    </select>
                  </label>
                  <Button type="submit" variant="outline" className="min-h-12 sm:col-span-2">
                    Registrar decisão
                  </Button>
                </form>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
