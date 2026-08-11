import { setEventAttendance } from "@/app/app/[teamSlug]/events/actions";
import { EventCancelForm } from "@/components/event-cancel-form";
import { EventSeriesExtensionForm } from "@/components/event-series-extension-form";
import { PublicEventLinkCard } from "@/components/public-event-link-card";
import { EventWhatsAppReminders } from "@/components/event-whatsapp-reminders";
import { EventLineupEditor } from "@/components/event-lineup-editor";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { Button } from "@/components/ui/button";
import { AppContainer } from "@/components/ui/app-shell";
import { TeamAppHeader } from "@/components/team-app-header";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { requireUser } from "@/lib/auth/dal";
import { getInternalSquads } from "@/lib/data/internal-squads";
import { getAppUrl } from "@/lib/env/server";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import type { InternalSquadBadgeKey } from "@/lib/features/team-division/internal-squads";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  MapPin,
  NotebookTabs,
  Pencil,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const kindLabels = {
  weekly_match: "Racha semanal",
  championship: "Campeonato",
  friendly: "Amistoso",
  tournament: "Torneio",
  training: "Treino",
  other: "Outro",
};

const statusLabels = {
  pending: "Sem resposta",
  confirmed: "Confirmado",
  declined: "Não vai",
  maybe: "Talvez",
  waitlist: "Espera",
};

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string; eventId: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    attendance?: string;
    cancelled?: string;
    extended?: string;
  }>;
}) {
  const user = await requireUser();
  const { teamSlug, eventId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase.from("teams").select("id, name, slug, timezone").eq("slug", teamSlug).maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();

  const [{ data: membership }, { data: event }] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, public_id, series_id, title, kind, organization_mode, sport_format, starts_at, ends_at, attendance_deadline, status, opponent_name, venue_id, cancelled_at")
      .eq("id", eventId)
      .eq("team_id", team.id)
      .maybeSingle(),
  ]);
  if (!membership || !event) notFound();

  const [{ data: series }, { count: seriesOccurrenceCount }] =
    event.series_id
      ? await Promise.all([
          supabase
            .from("event_series")
            .select("id, is_active")
            .eq("id", event.series_id)
            .eq("team_id", team.id)
            .maybeSingle(),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("series_id", event.series_id)
            .eq("team_id", team.id),
        ])
      : [{ data: null }, { count: 0 }];

  const [{ data: athletes }, { data: attendance }, { data: venue }, { data: positionPreferences }] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, full_name, preferred_name, shirt_number, status")
      .eq("team_id", team.id)
      .is("removed_at", null)
      .in("status", ["active", "inactive"])
      .order("preferred_name", { nullsFirst: false })
      .order("full_name"),
    supabase
      .from("event_attendance")
      .select("athlete_id, status, source, responded_at")
      .eq("event_id", event.id),
    event.venue_id
      ? supabase.from("venues").select("name, address").eq("id", event.venue_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("athlete_position_preferences")
      .select("athlete_id, position_code")
      .eq("team_id", team.id)
      .eq("sport_format", event.sport_format),
  ]);

  const attendanceByAthlete = new Map((attendance ?? []).map((response) => [response.athlete_id, response]));
  const call = (athletes ?? []).map((athlete) => ({
    ...athlete,
    response: attendanceByAthlete.get(athlete.id) ?? {
      athlete_id: athlete.id,
      status: "pending" as const,
      source: "admin" as const,
      responded_at: null,
    },
  }));
  const counts = {
    confirmed: call.filter((item) => item.response.status === "confirmed").length,
    maybe: call.filter((item) => item.response.status === "maybe").length,
    declined: call.filter((item) => item.response.status === "declined").length,
    pending: call.filter((item) => item.response.status === "pending").length,
  };
  const confirmed = call.filter((item) => item.response.status === "confirmed");
  const goalkeeperAthletes = new Set(
    (positionPreferences ?? [])
      .filter((preference) => preference.position_code === "GK")
      .map((preference) => preference.athlete_id),
  );
  const isScheduled = event.status === "scheduled";
  const isEditable =
    isScheduled && new Date(event.starts_at).valueOf() > new Date().valueOf();
  const eventControlEnabled =
    isEditable && (await isTeamFeatureEnabled(team.id, "event_control"));
  const publicEventPageEnabled = await isTeamFeatureEnabled(
    team.id,
    "public_event_page",
  );
  const teamDivisionEnabled =
    isEditable && (await isTeamFeatureEnabled(team.id, "team_division"));
  const publicEventUrl = publicEventPageEnabled
    ? new URL(`/e/${event.public_id}`, getAppUrl()).toString()
    : null;
  const whatsappRemindersEnabled =
    isEditable &&
    membership.role !== "manager" &&
    (await isTeamFeatureEnabled(team.id, "whatsapp_reminders"));
  const [
    squadsResult,
    spotsResult,
    exclusionsResult,
    matchesResult,
    sidesResult,
    activeRevisionResult,
  ] =
    teamDivisionEnabled
      ? await Promise.all([
          supabase
            .from("event_squads")
            .select("id, name, color, sort_order")
            .eq("event_id", event.id)
            .eq("team_id", team.id)
            .order("sort_order"),
          supabase
            .from("lineup_spots")
            .select("athlete_id, squad_id")
            .eq("event_id", event.id)
            .eq("team_id", team.id),
          supabase
            .from("event_lineup_exclusions")
            .select("athlete_id")
            .eq("event_id", event.id)
            .eq("team_id", team.id),
          supabase
            .from("event_matches")
            .select("id, ordinal, status")
            .eq("event_id", event.id)
            .eq("team_id", team.id)
            .in("status", ["scheduled", "live"])
            .order("ordinal"),
          supabase
            .from("match_sides")
            .select("match_id, side_index, label, squad_id")
            .eq("event_id", event.id)
            .eq("team_id", team.id)
            .order("side_index"),
          supabase
            .from("event_lineup_revisions")
            .select("revision, published_at")
            .eq("event_id", event.id)
            .eq("team_id", team.id)
            .eq("is_active", true)
            .maybeSingle(),
        ])
      : [
          { data: null, error: null },
          { data: null, error: null },
          { data: null, error: null },
          { data: null, error: null },
          { data: null, error: null },
          { data: null, error: null },
        ];
  const lineupContractAvailable =
    teamDivisionEnabled &&
    !squadsResult.error &&
    !spotsResult.error &&
    !exclusionsResult.error &&
    !matchesResult.error &&
    !sidesResult.error &&
    !activeRevisionResult.error;
  const enhancedSquadsResult = teamDivisionEnabled && !squadsResult.error
    ? await supabase
        .from("event_squads")
        .select("id, name, color, sort_order, internal_team_id, badge_key")
        .eq("event_id", event.id)
        .eq("team_id", team.id)
        .order("sort_order")
    : { data: null, error: null };
  const savedSquadRows = enhancedSquadsResult.error
    ? (squadsResult.data ?? [])
    : (enhancedSquadsResult.data ?? []);
  const internalSquads = teamDivisionEnabled ? await getInternalSquads(team.id) : [];
  const savedSquads = savedSquadRows.map((squad) => ({
    id: squad.id,
    name: squad.name,
    color: squad.color ?? "#0D9488",
    sortOrder: squad.sort_order,
    internalTeamId: ("internal_team_id" in squad ? squad.internal_team_id : null) as string | null,
    badgeKey: ("badge_key" in squad ? squad.badge_key : "shield") as InternalSquadBadgeKey,
  }));
  const initialSquads = savedSquads.length > 0
    ? [...savedSquads]
    : internalSquads.map((internalSquad) => ({
        id: crypto.randomUUID(),
        name: internalSquad.name,
        color: internalSquad.color,
        sortOrder: internalSquad.sortOrder,
        internalTeamId: internalSquad.id,
        badgeKey: internalSquad.badgeKey,
      }));
  const defaultSquadColors = ["#0D9488", "#2563EB"];
  while (initialSquads.length < 2) {
    const index = initialSquads.length;
    initialSquads.push({
      id: crypto.randomUUID(),
      name: `Time ${index === 0 ? "A" : "B"}`,
      color: defaultSquadColors[index] ?? "#0D9488",
      sortOrder: index + 1,
      internalTeamId: null,
      badgeKey: "shield",
    });
  }
  const spotByAthlete = new Map(
    (spotsResult.data ?? []).map((spot) => [spot.athlete_id, spot.squad_id]),
  );
  const excludedAthletes = new Set(
    (exclusionsResult.data ?? []).map((exclusion) => exclusion.athlete_id),
  );
  const matchOrdinalById = new Map(
    (matchesResult.data ?? []).map((match) => [match.id, match.ordinal]),
  );
  const lineupMatchSides = (sidesResult.data ?? []).flatMap((side) => {
    const matchOrdinal = matchOrdinalById.get(side.match_id);
    return matchOrdinal
      ? [{
          matchId: side.match_id,
          matchOrdinal,
          sideIndex: side.side_index,
          label: side.label,
          squadId: side.squad_id,
        }]
      : [];
  });
  const [reminderSettingsResult, reminderStateResult] =
    whatsappRemindersEnabled
      ? await Promise.all([
          supabase
            .from("event_whatsapp_reminder_settings")
            .select("first_offset_minutes, second_offset_minutes, is_override")
            .eq("event_id", event.id)
            .eq("team_id", team.id)
            .maybeSingle(),
          supabase.rpc("get_event_whatsapp_reminder_state", {
            requested_event_id: event.id,
          }),
        ])
      : [
          { data: null, error: null },
          { data: null, error: null },
        ];
  if (reminderSettingsResult.error || reminderStateResult.error) {
    throw new Error("Não foi possível carregar os lembretes do evento.");
  }
  const currentSeriesOccurrences = seriesOccurrenceCount ?? 0;
  const maxAdditionalOccurrences = Math.max(
    0,
    52 - currentSeriesOccurrences,
  );
  const canExtendSeries =
    eventControlEnabled &&
    Boolean(event.series_id) &&
    Boolean(series?.is_active) &&
    maxAdditionalOccurrences > 0;

  return (
    <main className="app-canvas pb-24">
      <TeamAppHeader currentName={team.name} currentSlug={team.slug} teams={teams ?? []} />
      <AppContainer>
        {query.created === "1" && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            <BadgeCheck className="size-5 shrink-0" aria-hidden /> Evento criado e chamada aberta para o elenco ativo.
          </div>
        )}

        {(query.updated === "single_event" ||
          query.updated === "this_and_future") && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            <BadgeCheck className="size-5 shrink-0" aria-hidden />
            {query.updated === "this_and_future"
              ? "Evento e próximas ocorrências atualizados. Exceções individuais foram preservadas."
              : "Esta ocorrência foi atualizada sem alterar as demais."}
          </div>
        )}

        {event.status === "cancelled" && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-950"
          >
            <X className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              {query.cancelled === "this_and_future"
                ? "Esta ocorrência e as próximas foram canceladas. A série foi encerrada."
                : "Evento cancelado."}{" "}
              Presenças, times montados e súmula foram preservados.
              {event.cancelled_at
                ? ` Cancelamento registrado em ${new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: team.timezone,
                  }).format(new Date(event.cancelled_at))}.`
                : null}
            </span>
          </div>
        )}

        {query.extended && Number(query.extended) > 0 && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-950"
          >
            <BadgeCheck className="size-5 shrink-0" aria-hidden />
            {Number(query.extended) === 1
              ? "Uma nova data foi adicionada à série."
              : `${Number(query.extended)} novas datas foram adicionadas à série.`}
          </div>
        )}

        {query.attendance === "updated" && (
          <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            <BadgeCheck className="size-5 shrink-0" aria-hidden />
            Presença atualizada.
          </div>
        )}

        {query.attendance === "error" && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            Não foi possível atualizar a presença. Tente novamente.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/app/${team.slug}/events`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800">
            <ArrowLeft className="size-4" aria-hidden /> Voltar à agenda
          </Link>
          <div className="flex items-center gap-2">
            {isScheduled || event.status === "completed" ? (
              <Button asChild className="bg-grass hover:bg-slate-800">
                <Link href={`/app/${team.slug}/events/${event.id}/matches`}>
                  <NotebookTabs aria-hidden /> Partidas
                </Link>
              </Button>
            ) : null}
            {isEditable && (
              <Button asChild variant="outline">
                <Link href={`/app/${team.slug}/events/${event.id}/edit`}>
                  <Pencil aria-hidden /> Editar
                </Link>
              </Button>
            )}
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] bg-grass p-6 text-white shadow-float sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-200">
            {event.status === "cancelled" ? (
              <>
                <span className="rounded-full bg-red-500/20 px-2 py-1 text-red-100">
                  Cancelado
                </span>
                <span>·</span>
              </>
            ) : null}
            <span>{kindLabels[event.kind]}</span><span>·</span>
            <span>{event.sport_format === "field" ? "Campo" : event.sport_format === "futsal" ? "Futsal" : "Society"}</span><span>·</span>
            <span>{event.organization_mode === "split_teams" ? "Dividir times" : "Time único"}</span>
          </div>
          <h1 className="relative mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{event.title}</h1>
          {event.opponent_name && <p className="mt-1 text-sm text-emerald-100">vs. {event.opponent_name}</p>}
          <div className="mt-6 grid gap-3 text-sm text-emerald-50 sm:grid-cols-3">
            <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden /> {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: team.timezone }).format(new Date(event.starts_at))}</p>
            <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden /> {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: team.timezone }).format(new Date(event.starts_at))}</p>
            {venue && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden /> <span>{venue.name}{venue.address ? <small className="block text-emerald-200">{venue.address}</small> : null}</span></p>}
          </div>
        </section>

        {publicEventUrl ? (
          <PublicEventLinkCard publicUrl={publicEventUrl} />
        ) : null}

        {whatsappRemindersEnabled && reminderSettingsResult.data ? (
          <EventWhatsAppReminders
            teamId={team.id}
            teamSlug={team.slug}
            eventId={event.id}
            timezone={team.timezone}
            isOverride={reminderSettingsResult.data.is_override}
            firstHours={reminderSettingsResult.data.first_offset_minutes / 60}
            secondHours={reminderSettingsResult.data.second_offset_minutes / 60}
            slots={(reminderStateResult.data ?? []).map((slot) => ({
              slotId: slot.slot_id,
              slotKey: slot.slot_key,
              status: slot.status,
              scheduledFor: slot.scheduled_for,
              triggeredManually: slot.triggered_manually,
              consumedAt: slot.consumed_at,
              eligibleCount: slot.eligible_count,
              outboxCount: slot.outbox_count,
              pendingCount: slot.pending_count,
              sentCount: slot.sent_count,
              failedCount: slot.failed_count,
            }))}
          />
        ) : null}

        <section className="grid grid-cols-4 gap-2">
          {[
            ["Confirmados", counts.confirmed, "text-emerald-700"],
            ["Talvez", counts.maybe, "text-amber-700"],
            ["Não vão", counts.declined, "text-red-700"],
            ["Pendentes", counts.pending, "text-slate-600"],
          ].map(([label, value, color]) => (
            <article key={label as string} className="app-surface min-w-0 p-3 text-center sm:p-4">
              <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500 sm:text-xs">{label}</p>
            </article>
          ))}
        </section>

        {lineupContractAvailable ? (
          <EventLineupEditor
            teamId={team.id}
            teamSlug={team.slug}
            eventId={event.id}
            publicId={event.public_id}
            initialRequestId={crypto.randomUUID()}
            initialSquads={initialSquads}
            athletes={confirmed
              .filter((athlete) => athlete.status === "active")
              .map((athlete) => ({
                id: athlete.id,
                name: athlete.preferred_name || athlete.full_name,
                shirtNumber: athlete.shirt_number,
                destination:
                  spotByAthlete.get(athlete.id) ??
                  (excludedAthletes.has(athlete.id) ? "excluded" : "unassigned"),
                isGoalkeeper: goalkeeperAthletes.has(athlete.id),
              }))}
            matchSides={savedSquads.length > 0 ? lineupMatchSides : []}
            canPublish={membership.role !== "manager"}
            activeRevision={activeRevisionResult.data ? {
              revision: activeRevisionResult.data.revision,
              publishedAt: activeRevisionResult.data.published_at,
            } : null}
            hasSavedDraft={savedSquads.length > 0}
            autoSuggestOnLoad={savedSquads.length === 0}
          />
        ) : null}

        <section>
          <div className="flex items-end justify-between gap-3">
            <div><p className="app-kicker">Presença</p><h2 className="mt-1 text-xl font-black tracking-tight">Chamada</h2><p className="mt-1 text-sm text-slate-500">Toque na resposta de cada atleta. Alterações ficam salvas imediatamente.</p></div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{call.length} atletas</span>
          </div>
          {call.length ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {call.map((athlete) => {
                const disabled = !isScheduled || athlete.status !== "active";
                return (
                  <article key={athlete.id} className="app-surface p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">{athlete.shirt_number ?? <UsersRound className="size-4" aria-hidden />}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{athlete.preferred_name || athlete.full_name}</h3>
                        <p className="text-xs text-slate-500">{athlete.status === "inactive" ? "Atleta inativo" : statusLabels[athlete.response.status]}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {[
                        ["confirmed", "Vai", Check, "data-[active=true]:border-emerald-600 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-800"],
                        ["maybe", "Talvez", CircleHelp, "data-[active=true]:border-amber-500 data-[active=true]:bg-amber-50 data-[active=true]:text-amber-800"],
                        ["declined", "Não", X, "data-[active=true]:border-red-500 data-[active=true]:bg-red-50 data-[active=true]:text-red-700"],
                        ["pending", "Limpar", Clock3, "data-[active=true]:border-slate-500 data-[active=true]:bg-slate-100"],
                      ].map(([status, label, Icon, activeClass]) => {
                        const StatusIcon = Icon as typeof Check;
                        return (
                          <form key={status as string} action={setEventAttendance}>
                            <input type="hidden" name="teamSlug" value={team.slug} />
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="athleteId" value={athlete.id} />
                            <input type="hidden" name="status" value={status as string} />
                            <AsyncSubmitButton
                              pendingLabel={`Salvando resposta: ${label as string}`}
                              iconOnly
                              variant="outline"
                              disabled={disabled}
                              data-active={athlete.response.status === status}
                              aria-label={`${label} — ${athlete.preferred_name || athlete.full_name}`}
                              className={`flex min-h-12 w-full touch-manipulation flex-col items-center justify-center rounded-xl border border-slate-200 text-[10px] font-bold text-slate-500 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${activeClass}`}
                            >
                              <StatusIcon className="mb-0.5 size-4" aria-hidden /> {label as string}
                            </AsyncSubmitButton>
                          </form>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="app-surface mt-3 border-dashed p-8 text-center"><UsersRound className="mx-auto size-8 text-slate-400" aria-hidden /><p className="mt-3 font-semibold">Nenhum atleta na chamada</p><Button asChild className="mt-4"><Link href={`/app/${team.slug}/athletes/new`}>Cadastrar atleta</Link></Button></div>
          )}
        </section>

        <section id="lineup" className="scroll-mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700"><UserRoundCheck className="size-5" aria-hidden /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Disponíveis na súmula</p>
              <h2 className="mt-1 text-lg font-bold text-emerald-950">{confirmed.length} atletas confirmados</h2>
              <p className="mt-1 text-sm leading-6 text-emerald-900/80">Somente confirmados podem receber gols, assistências ou cartões nesta partida.</p>
            </div>
          </div>
          {confirmed.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{confirmed.map((athlete) => <span key={athlete.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm">{athlete.preferred_name || athlete.full_name}</span>)}</div>}
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> A aprovação do vínculo e a confirmação da presença continuam sendo exigidas pelo sistema.</div>
        </section>

        {canExtendSeries && event.series_id ? (
          <EventSeriesExtensionForm
            teamId={team.id}
            teamSlug={team.slug}
            eventId={event.id}
            seriesId={event.series_id}
            currentOccurrences={currentSeriesOccurrences}
            maxAdditionalOccurrences={maxAdditionalOccurrences}
            initialRequestId={crypto.randomUUID()}
          />
        ) : null}

        {eventControlEnabled ? (
          <EventCancelForm
            teamId={team.id}
            teamSlug={team.slug}
            eventId={event.id}
            hasSeries={Boolean(event.series_id)}
            initialRequestId={crypto.randomUUID()}
          />
        ) : null}
      </AppContainer>
      <TeamBottomNav teamSlug={team.slug} active="events" nextEventId={event.id} />
    </main>
  );
}
