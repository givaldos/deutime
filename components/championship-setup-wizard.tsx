"use client";

import { finishChampionshipSetup, type ChampionshipActionState } from "@/app/app/[teamSlug]/championships/actions";
import { ChampionshipCreationProgress } from "@/components/professional-creation-actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { createRequestId } from "@/lib/client/request-id";
import { CalendarCheck, ChevronLeft, Send, UsersRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

type Participant = {
  id: string;
  name: string;
  internalTeamId: string | null;
};

type Athlete = {
  id: string;
  name: string;
  shirtNumber: number | null;
};

export type ChampionshipSetupFixture = {
  id: string;
  roundNumber: number;
  ordinal: number;
  sideOneName: string;
  sideTwoName: string;
};

const initialState: ChampionshipActionState = {};

function addLocalTime(value: string, days: number, minutes: number) {
  if (!value) return "";
  const date = new Date(`${value}:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().slice(0, 16);
}

export function buildChampionshipSchedule(
  fixtures: ChampionshipSetupFixture[],
  firstStart: string,
  daysBetweenRounds: number,
  minutesBetweenMatches: number,
) {
  const rounds = [...new Set(fixtures.map((fixture) => fixture.roundNumber))]
    .sort((a, b) => a - b);
  const indexWithinRound = new Map<number, number>();
  return fixtures.map((fixture) => {
    const roundIndex = rounds.indexOf(fixture.roundNumber);
    const matchIndex = indexWithinRound.get(fixture.roundNumber) ?? 0;
    indexWithinRound.set(fixture.roundNumber, matchIndex + 1);
    return {
      fixtureId: fixture.id,
      startsAtLocal: addLocalTime(
        firstStart,
        roundIndex * daysBetweenRounds,
        matchIndex * minutesBetweenMatches,
      ),
    };
  });
}

function displayLocalTime(value: string) {
  if (!value) return "Data pendente";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}:00Z`));
}

export function ChampionshipSetupWizard({
  teamId,
  teamSlug,
  championshipId,
  teamTimezone,
  sportFormat,
  participants,
  athletes,
  fixtures,
  defaultStartLocal,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  teamTimezone: string;
  sportFormat: "field" | "society" | "futsal";
  participants: Participant[];
  athletes: Athlete[];
  fixtures: ChampionshipSetupFixture[];
  defaultStartLocal: string;
}) {
  const [state, action, pending] = useActionState(finishChampionshipSetup, initialState);
  const [requestId] = useState(createRequestId);
  const [step, setStep] = useState<4 | 5>(4);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [firstStart, setFirstStart] = useState(defaultStartLocal);
  const [daysBetweenRounds, setDaysBetweenRounds] = useState(7);
  const [minutesBetweenMatches, setMinutesBetweenMatches] = useState(120);
  const [durationMinutes, setDurationMinutes] = useState(90);

  const internalParticipants = participants.filter((participant) => participant.internalTeamId);
  const roster = athletes.flatMap((athlete) => {
    const participantId = assignments[athlete.id];
    return participantId ? [{ participantId, athleteId: athlete.id }] : [];
  });
  const coveredParticipantIds = new Set(roster.map((item) => item.participantId));
  const rosterReady = internalParticipants.every((participant) =>
    coveredParticipantIds.has(participant.id));

  const schedule = useMemo(() => {
    return buildChampionshipSchedule(
      fixtures,
      firstStart,
      daysBetweenRounds,
      minutesBetweenMatches,
    );
  }, [daysBetweenRounds, firstStart, fixtures, minutesBetweenMatches]);

  const scheduledByFixture = new Map(schedule.map((item) => [item.fixtureId, item.startsAtLocal]));
  const scheduleReady = Boolean(firstStart) && schedule.every((item) => item.startsAtLocal);

  return (
    <section className="space-y-5" aria-label="Configuração do campeonato">
      <ChampionshipCreationProgress currentStep={step} />

      {step === 4 ? (
        <div className="app-surface p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <UsersRound className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-black text-graphite">Quem joga em cada equipe?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Você pode deixar alguém sem convocação. Cada equipe interna precisa ter ao menos um atleta.
              </p>
            </div>
          </div>

          {athletes.length ? (
            <div className="mt-5 space-y-3">
              {athletes.map((athlete) => (
                <label key={athlete.id} className="block rounded-2xl border border-slate-200 bg-white p-3">
                  <span className="flex items-center gap-2 text-sm font-black text-graphite">
                    {athlete.shirtNumber ? <span className="text-emerald-700">#{athlete.shirtNumber}</span> : null}
                    {athlete.name}
                  </span>
                  <select
                    aria-label={`Equipe de ${athlete.name}`}
                    value={assignments[athlete.id] ?? ""}
                    onChange={(event) => setAssignments((current) => ({
                      ...current,
                      [athlete.id]: event.target.value,
                    }))}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite"
                  >
                    <option value="">Não convocado</option>
                    {internalParticipants.map((participant) => (
                      <option key={participant.id} value={participant.id}>{participant.name}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-black">Cadastre os atletas antes de continuar.</p>
              <Link href={`/app/${teamSlug}/athletes`} className="mt-3 inline-flex min-h-11 items-center font-black text-emerald-800 underline">
                Abrir atletas
              </Link>
            </div>
          )}

          {!rosterReady && athletes.length ? (
            <p className="mt-4 text-sm font-bold text-amber-800">
              Falta convocar ao menos um atleta para cada equipe interna.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!rosterReady || fixtures.length === 0}
            onClick={() => setStep(5)}
            className="mt-5 min-h-14 w-full rounded-xl bg-emerald-700 px-5 text-base font-black text-white disabled:opacity-40"
          >
            Próximo: agenda
          </button>
        </div>
      ) : (
        <form action={action} className="app-surface space-y-5 p-5 sm:p-7">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="championshipId" value={championshipId} />
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="rosters" value={JSON.stringify(roster)} />
          <input type="hidden" name="schedule" value={JSON.stringify(schedule)} />
          <input type="hidden" name="sportFormat" value={sportFormat} />
          <input type="hidden" name="durationMinutes" value={durationMinutes} />
          <input type="hidden" name="attendanceDeadlineMinutes" value="1440" />

          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <CalendarCheck className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-black text-graphite">Quando começam os jogos?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                A agenda é montada automaticamente por rodada. Confira o resumo e conclua.
              </p>
            </div>
          </div>

          <label className="block text-xs font-bold text-slate-600">
            Primeiro jogo
            <input type="datetime-local" value={firstStart} onChange={(event) => setFirstStart(event.target.value)} required className="mt-1 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-black text-graphite" />
            <span className="mt-1 block font-normal text-slate-500">Fuso do time: {teamTimezone}</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">
              Intervalo entre rodadas
              <select value={daysBetweenRounds} onChange={(event) => setDaysBetweenRounds(Number(event.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-graphite">
                <option value="1">1 dia</option>
                <option value="7">1 semana</option>
                <option value="14">2 semanas</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Duração do jogo
              <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-graphite">
                <option value="60">1 hora</option>
                <option value="90">1h30</option>
                <option value="120">2 horas</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-bold text-slate-600">
            Intervalo entre jogos da mesma rodada
            <select value={minutesBetweenMatches} onChange={(event) => setMinutesBetweenMatches(Number(event.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-black text-graphite">
              <option value="90">1h30</option>
              <option value="120">2 horas</option>
              <option value="180">3 horas</option>
              <option value="1440">1 dia</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Local
              <input name="venueName" maxLength={120} placeholder="Ex.: Arena Central" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Endereço (opcional)
              <input name="venueAddress" maxLength={500} autoComplete="street-address" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite" />
            </label>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-graphite">{fixtures.length} jogos serão criados</p>
            <div className="mt-3 space-y-2">
              {fixtures.slice(0, 5).map((fixture) => (
                <div key={fixture.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-bold text-slate-700">{fixture.sideOneName} × {fixture.sideTwoName}</span>
                  <span className="shrink-0 text-slate-500">{displayLocalTime(scheduledByFixture.get(fixture.id) ?? "")}</span>
                </div>
              ))}
            </div>
            {fixtures.length > 5 ? <p className="mt-2 text-xs text-slate-500">E mais {fixtures.length - 5} jogos seguindo a mesma cadência.</p> : null}
          </div>

          {state.message ? (
            <p role={state.outcome === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm font-bold ${state.outcome === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
              {state.message}
            </p>
          ) : null}

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <button type="button" onClick={() => setStep(4)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-black text-slate-700">
              <ChevronLeft className="size-4" aria-hidden /> Voltar
            </button>
            <AsyncSubmitButton disabled={pending || !scheduleReady} pendingLabel="Criando agenda e partidas..." className="min-h-14 w-full text-base">
              <Send aria-hidden /> Criar agenda e publicar
            </AsyncSubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
