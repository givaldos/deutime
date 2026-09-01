"use client";

import {
  createEvent,
  type CreateEventState,
  updateEvent,
} from "@/app/app/[teamSlug]/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EVENT_CONFIRMATION_DEADLINE_OPTIONS,
  EVENT_DURATION_MINUTES_MAX,
  EVENT_DURATION_MINUTES_MIN,
  EVENT_DURATION_OPTIONS,
  isCommonEventDuration,
} from "@/lib/domain/event-options";
import { useActionState, useState } from "react";
import type { InternalSquad } from "@/lib/features/team-division/internal-squads";

const initialState: CreateEventState = {};

type EventFormValues = {
  title: string;
  kind: string;
  sportFormat: string;
  startsAtLocal: string;
  durationMinutes: string;
  deadlineMinutes: string;
  repeatWeeks: string;
  organizationMode: string;
  opponentName: string;
  venueName: string;
  venueAddress: string;
  editScope: string;
};

export type EditableEventValues = {
  id: string;
  seriesId: string | null;
  title: string;
  kind: string;
  organizationMode: string;
  sportFormat: string;
  startsAtLocal: string;
  durationMinutes: string;
  deadlineMinutes: string;
  opponentName: string;
  venueName: string;
  venueAddress: string;
};

function localDateTimeToIso(value: string) {
  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

export function AdminEventForm({
  teamId,
  teamSlug,
  teamTimezone,
  defaultSportFormat,
  eventControlEnabled,
  professionalSchedulingEnabled = false,
  internalSquads = [],
  defaultHomeTeamId,
  defaultAwayTeamId,
  initialRequestId,
  event,
}: {
  teamId: string;
  teamSlug: string;
  teamTimezone: string;
  defaultSportFormat: "field" | "society" | "futsal";
  eventControlEnabled: boolean;
  professionalSchedulingEnabled?: boolean;
  internalSquads?: InternalSquad[];
  defaultHomeTeamId?: string | null;
  defaultAwayTeamId?: string | null;
  initialRequestId: string;
  event?: EditableEventValues;
}) {
  const [state, formAction, pending] = useActionState(
    event ? updateEvent : createEvent,
    initialState,
  );
  const isEditing = Boolean(event);
  const [recurrenceMode, setRecurrenceMode] = useState<"once" | "weekly">(
    professionalSchedulingEnabled ? "once" : "weekly",
  );
  const [values, setValues] = useState<EventFormValues>({
    title: event?.title ?? "",
    kind:
      event?.kind ??
      (professionalSchedulingEnabled ? "friendly" : "weekly_match"),
    sportFormat: event?.sportFormat ?? defaultSportFormat,
    startsAtLocal: event?.startsAtLocal ?? "",
    durationMinutes: event?.durationMinutes ?? "90",
    deadlineMinutes: event?.deadlineMinutes ?? "120",
    repeatWeeks: professionalSchedulingEnabled ? "1" : "12",
    organizationMode: event?.organizationMode ?? "split_teams",
    opponentName: event?.opponentName ?? "",
    venueName: event?.venueName ?? "",
    venueAddress: event?.venueAddress ?? "",
    editScope: "single_event",
  });
  const [durationSelection, setDurationSelection] = useState(() => {
    const initialDuration = Number(event?.durationMinutes ?? 90);
    return isCommonEventDuration(initialDuration)
      ? String(initialDuration)
      : "custom";
  });
  const [editedFields, setEditedFields] = useState<Record<string, number>>({});
  const [editedAtAttempt, setEditedAtAttempt] = useState<number>();
  const [requestId] = useState(initialRequestId);
  const [homeInternalTeamId, setHomeInternalTeamId] = useState(
    defaultHomeTeamId ?? internalSquads[0]?.id ?? "",
  );
  const [awayInternalTeamId, setAwayInternalTeamId] = useState(
    defaultAwayTeamId ?? internalSquads[1]?.id ?? "",
  );
  const startsAtIso = eventControlEnabled
    ? ""
    : localDateTimeToIso(values.startsAtLocal);
  const currentAttempt = state.attempt ?? 0;

  function updateField(
    field: keyof EventFormValues,
    value: string,
    errorField: string = field,
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setEditedFields((current) => ({
      ...current,
      [errorField]: currentAttempt,
    }));
    setEditedAtAttempt(currentAttempt);
  }

  function updateKind(kind: string) {
    if (isEditing || professionalSchedulingEnabled) {
      updateField("kind", kind);
      return;
    }

    const weekly = kind === "weekly_match";

    setValues((current) => ({
      ...current,
      kind,
      repeatWeeks: weekly ? "12" : "1",
      organizationMode: weekly ? "split_teams" : "single_squad",
    }));
    setEditedFields((current) => ({
      ...current,
      kind: currentAttempt,
      repeatWeeks: currentAttempt,
      organizationMode: currentAttempt,
    }));
    setEditedAtAttempt(currentAttempt);
  }

  function updateRecurrenceMode(mode: "once" | "weekly") {
    setRecurrenceMode(mode);
    updateField("repeatWeeks", mode === "weekly" ? "12" : "1");
  }

  function errorFor(field: string) {
    return editedFields[field] === currentAttempt
      ? undefined
      : state.errors?.[field]?.[0];
  }

  const titleError = errorFor("title");
  const kindError = errorFor("kind");
  const sportFormatError = errorFor("sportFormat");
  const startsAtError = errorFor(
    eventControlEnabled ? "startsAtLocal" : "startsAtIso",
  );
  const durationError = errorFor("durationMinutes");
  const deadlineError = errorFor("deadlineMinutes");
  const repeatWeeksError = errorFor("repeatWeeks");
  const organizationError = errorFor("organizationMode");
  const opponentError = errorFor("opponentName");
  const venueNameError = errorFor("venueName");
  const venueAddressError = errorFor("venueAddress");
  const editScopeError = errorFor("editScope");

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      {eventControlEnabled ? (
        <input type="hidden" name="requestId" value={requestId} />
      ) : (
        <input type="hidden" name="startsAtIso" value={startsAtIso} />
      )}
      {event && <input type="hidden" name="eventId" value={event.id} />}
      {event && !event.seriesId && (
        <input type="hidden" name="editScope" value="single_event" />
      )}

      {professionalSchedulingEnabled && !isEditing ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-graphite">
            Este jogo acontece
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:ring-2 has-[:checked]:ring-emerald-700/15">
              <input
                type="radio"
                name="recurrenceMode"
                value="once"
                checked={recurrenceMode === "once"}
                onChange={() => updateRecurrenceMode("once")}
                className="size-4 accent-emerald-700"
              />
              <span>
                <span className="block text-sm font-black text-graphite">
                  Uma vez
                </span>
                <span className="mt-1 block text-xs text-slate-600">
                  Cria somente este jogo
                </span>
              </span>
            </label>
            <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:ring-2 has-[:checked]:ring-emerald-700/15">
              <input
                type="radio"
                name="recurrenceMode"
                value="weekly"
                checked={recurrenceMode === "weekly"}
                onChange={() => updateRecurrenceMode("weekly")}
                className="size-4 accent-emerald-700"
              />
              <span>
                <span className="block text-sm font-black text-graphite">
                  Toda semana
                </span>
                <span className="mt-1 block text-xs text-slate-600">
                  Cria uma série recorrente
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      ) : null}

      {professionalSchedulingEnabled && !isEditing && recurrenceMode === "once" ? (
        <input type="hidden" name="repeatWeeks" value="1" />
      ) : null}

      {professionalSchedulingEnabled && !isEditing ? (
        <fieldset className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <legend className="px-1 text-sm font-black text-emerald-950">
            Equipes do jogo
          </legend>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            Os padrões já estão preenchidos. Troque os lados se este jogo pedir outra combinação.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-emerald-950">
              Primeira equipe
              <select
                name="homeInternalTeamId"
                value={homeInternalTeamId}
                onChange={(event) => setHomeInternalTeamId(event.target.value)}
                required
                className="mt-1 min-h-12 w-full rounded-xl border border-emerald-200 bg-white px-3 text-base font-bold text-graphite"
              >
                {internalSquads.map((squad) => (
                  <option key={squad.id} value={squad.id} disabled={squad.id === awayInternalTeamId}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-emerald-950">
              Segunda equipe
              <select
                name="awayInternalTeamId"
                value={awayInternalTeamId}
                onChange={(event) => setAwayInternalTeamId(event.target.value)}
                required
                className="mt-1 min-h-12 w-full rounded-xl border border-emerald-200 bg-white px-3 text-base font-bold text-graphite"
              >
                {internalSquads.map((squad) => (
                  <option key={squad.id} value={squad.id} disabled={squad.id === homeInternalTeamId}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="event-title">
          {professionalSchedulingEnabled ? "Nome do jogo" : "Nome do evento"}
        </Label>
        <Input
          id="event-title"
          name="title"
          className="h-12 bg-white"
          placeholder="Ex.: Racha de quinta"
          minLength={2}
          maxLength={120}
          required
          value={values.title}
          onChange={(event) => updateField("title", event.target.value)}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "event-title-error" : undefined}
        />
        <FieldError id="event-title-error" message={titleError} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event-kind">
            {professionalSchedulingEnabled ? "Tipo do jogo" : "Tipo"}
          </Label>
          <select
            id="event-kind"
            name="kind"
            value={values.kind}
            onChange={(event) => updateKind(event.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm"
            required
            aria-invalid={Boolean(kindError)}
            aria-describedby={kindError ? "event-kind-error" : undefined}
          >
            <option value="weekly_match">Racha semanal</option>
            <option value="friendly">Amistoso</option>
            {!professionalSchedulingEnabled ? (
              <option value="championship">Campeonato</option>
            ) : null}
            <option value="tournament">Torneio</option>
            <option value="training">Treino</option>
            <option value="other">Outro</option>
          </select>
          <FieldError id="event-kind-error" message={kindError} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sport-format">Modalidade</Label>
          <select
            id="sport-format"
            name="sportFormat"
            value={values.sportFormat}
            onChange={(event) => updateField("sportFormat", event.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm"
            required
            aria-invalid={Boolean(sportFormatError)}
            aria-describedby={sportFormatError ? "sport-format-error" : undefined}
          >
            <option value="society">Society</option>
            <option value="futsal">Futsal</option>
            <option value="field">Campo</option>
          </select>
          <FieldError id="sport-format-error" message={sportFormatError} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="starts-at">Data e hora</Label>
        <Input
          id="starts-at"
          name="startsAtLocal"
          type="datetime-local"
          className="h-12 bg-white"
          required
          value={values.startsAtLocal}
          onChange={(event) =>
            updateField(
              "startsAtLocal",
              event.target.value,
              eventControlEnabled ? "startsAtLocal" : "startsAtIso",
            )
          }
          aria-invalid={Boolean(startsAtError)}
          aria-describedby={
            startsAtError ? "starts-at-error" : "starts-at-help"
          }
        />
        <p id="starts-at-help" className="text-xs text-slate-500">
          {eventControlEnabled
            ? `O horário será salvo no fuso do time (${teamTimezone}), independentemente deste aparelho.`
            : "O horário é interpretado no fuso deste celular e precisa estar no futuro."}
        </p>
        <FieldError id="starts-at-error" message={startsAtError} />
      </div>

      <input
        type="hidden"
        name="durationMinutes"
        value={values.durationMinutes}
      />
      <div
        className={`grid gap-3 ${isEditing ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        <div className="space-y-2">
          <Label htmlFor="duration">Duração</Label>
          <select
            id="duration"
            value={durationSelection}
            onChange={(event) => {
              const selection = event.target.value;
              setDurationSelection(selection);
              updateField(
                "durationMinutes",
                selection === "custom" ? "" : selection,
              );
            }}
            className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm"
            aria-invalid={Boolean(durationError)}
            aria-describedby={durationError ? "duration-error" : undefined}
          >
            {EVENT_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Personalizada</option>
          </select>
          {durationSelection === "custom" && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="custom-duration">Minutos</Label>
              <Input
                id="custom-duration"
                className="h-12 bg-white"
                type="number"
                min={EVENT_DURATION_MINUTES_MIN}
                max={EVENT_DURATION_MINUTES_MAX}
                step={1}
                inputMode="numeric"
                required
                value={values.durationMinutes}
                onChange={(event) =>
                  updateField("durationMinutes", event.target.value)
                }
                aria-invalid={Boolean(durationError)}
                aria-describedby={durationError ? "duration-error" : undefined}
              />
              <p className="text-xs text-slate-500">Entre 15 e 480 minutos.</p>
            </div>
          )}
          <FieldError id="duration-error" message={durationError} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Confirmação</Label>
          <select
            id="deadline"
            name="deadlineMinutes"
            value={values.deadlineMinutes}
            onChange={(event) =>
              updateField("deadlineMinutes", event.target.value)
            }
            className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm"
            aria-invalid={Boolean(deadlineError)}
            aria-describedby={deadlineError ? "deadline-error" : undefined}
          >
            {EVENT_CONFIRMATION_DEADLINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError id="deadline-error" message={deadlineError} />
        </div>
        {!isEditing &&
          (!professionalSchedulingEnabled || recurrenceMode === "weekly") && (
          <div className="space-y-2">
            <Label htmlFor="repeat-weeks">Semanas</Label>
            <Input
              id="repeat-weeks"
              name="repeatWeeks"
              className="h-12 bg-white"
              type="number"
              min={1}
              max={52}
              value={values.repeatWeeks}
              onChange={(event) =>
                updateField("repeatWeeks", event.target.value)
              }
              inputMode="numeric"
              required
              aria-invalid={Boolean(repeatWeeksError)}
              aria-describedby={
                repeatWeeksError ? "repeat-weeks-error" : "repeat-weeks-help"
              }
            />
            <FieldError id="repeat-weeks-error" message={repeatWeeksError} />
          </div>
        )}
      </div>
      {!isEditing &&
        (!professionalSchedulingEnabled || recurrenceMode === "weekly") && (
        <p id="repeat-weeks-help" className="-mt-4 text-xs text-slate-500">
          {professionalSchedulingEnabled
            ? "Escolha de 2 a 52 semanas para esta série."
            : "Use 1 para evento avulso ou até 52 para repetir semanalmente."}
        </p>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Organização</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-medium has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-950">
            <input
              className="sr-only"
              type="radio"
              name="organizationMode"
              value="split_teams"
              checked={values.organizationMode === "split_teams"}
              onChange={(event) =>
                updateField("organizationMode", event.target.value)
              }
            />
            Dividir times
          </label>
          <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-medium has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-950">
            <input
              className="sr-only"
              type="radio"
              name="organizationMode"
              value="single_squad"
              checked={values.organizationMode === "single_squad"}
              onChange={(event) =>
                updateField("organizationMode", event.target.value)
              }
            />
            Time único
          </label>
        </div>
        <FieldError id="organization-error" message={organizationError} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="opponent">Adversário (opcional)</Label>
        <Input
          id="opponent"
          name="opponentName"
          className="h-12 bg-white"
          maxLength={120}
          value={values.opponentName}
          onChange={(event) => updateField("opponentName", event.target.value)}
          aria-invalid={Boolean(opponentError)}
          aria-describedby={opponentError ? "opponent-error" : undefined}
        />
        <FieldError id="opponent-error" message={opponentError} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="venue-name">Local</Label>
          <Input
            id="venue-name"
            name="venueName"
            className="h-12 bg-white"
            placeholder="Arena Central"
            maxLength={120}
            value={values.venueName}
            onChange={(event) => updateField("venueName", event.target.value)}
            aria-invalid={Boolean(venueNameError)}
            aria-describedby={venueNameError ? "venue-name-error" : undefined}
          />
          <FieldError id="venue-name-error" message={venueNameError} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-address">Endereço</Label>
          <Input
            id="venue-address"
            name="venueAddress"
            className="h-12 bg-white"
            maxLength={500}
            value={values.venueAddress}
            onChange={(event) => updateField("venueAddress", event.target.value)}
            aria-invalid={Boolean(venueAddressError)}
            aria-describedby={
              venueAddressError ? "venue-address-error" : undefined
            }
          />
          <FieldError id="venue-address-error" message={venueAddressError} />
        </div>
      </div>

      {event?.seriesId && (
        <fieldset className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <legend className="px-1 text-sm font-bold text-amber-950">
            Aplicar alterações
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="cursor-pointer rounded-2xl border border-amber-200 bg-white p-4 has-[:checked]:border-emerald-700 has-[:checked]:ring-2 has-[:checked]:ring-emerald-700/15">
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 size-4 accent-emerald-700"
                  type="radio"
                  name="editScope"
                  value="single_event"
                  checked={values.editScope === "single_event"}
                  onChange={(event) =>
                    updateField("editScope", event.target.value)
                  }
                />
                <span>
                  <span className="block text-sm font-bold text-graphite">
                    Somente este evento
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    Mantém as outras datas da série como estão.
                  </span>
                </span>
              </span>
            </label>
            <label className="cursor-pointer rounded-2xl border border-amber-200 bg-white p-4 has-[:checked]:border-emerald-700 has-[:checked]:ring-2 has-[:checked]:ring-emerald-700/15">
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 size-4 accent-emerald-700"
                  type="radio"
                  name="editScope"
                  value="this_and_future"
                  checked={values.editScope === "this_and_future"}
                  onChange={(event) =>
                    updateField("editScope", event.target.value)
                  }
                />
                <span>
                  <span className="block text-sm font-bold text-graphite">
                    Este e os próximos
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    Reorganiza as próximas semanas sem sobrescrever exceções.
                  </span>
                </span>
              </span>
            </label>
          </div>
          <FieldError id="edit-scope-error" message={editScopeError} />
        </fieldset>
      )}

      {state.message && editedAtAttempt !== currentAttempt && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
        disabled={
          pending ||
          !values.startsAtLocal ||
          (!eventControlEnabled && !startsAtIso)
        }
      >
        {pending
          ? isEditing
            ? "Salvando alterações..."
            : professionalSchedulingEnabled
              ? "Criando jogo..."
              : "Criando agenda..."
          : isEditing
            ? "Salvar alterações"
            : professionalSchedulingEnabled
              ? "Criar jogo e chamada"
              : "Criar evento e chamada"}
      </Button>
    </form>
  );
}
