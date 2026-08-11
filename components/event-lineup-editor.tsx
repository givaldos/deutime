"use client";

import {
  linkEventLineupSquadToMatchSide,
  saveEventLineupDraft,
  type EventLineupActionState,
} from "@/app/app/[teamSlug]/events/lineup-actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  CircleOff,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";

export type EventLineupSquad = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
};

export type EventLineupAthlete = {
  id: string;
  name: string;
  shirtNumber: number | null;
  destination: string;
};

export type EventLineupMatchSide = {
  matchId: string;
  matchOrdinal: number;
  sideIndex: number;
  label: string;
  squadId: string | null;
};

const initialActionState: EventLineupActionState = {};
const UNASSIGNED = "unassigned";
const EXCLUDED = "excluded";

export function EventLineupEditor({
  teamId,
  teamSlug,
  eventId,
  initialRequestId,
  initialSquads,
  athletes,
  matchSides,
}: {
  teamId: string;
  teamSlug: string;
  eventId: string;
  initialRequestId: string;
  initialSquads: EventLineupSquad[];
  athletes: EventLineupAthlete[];
  matchSides: EventLineupMatchSide[];
}) {
  const [actionState, formAction] = useActionState(
    saveEventLineupDraft,
    initialActionState,
  );
  const [squads, setSquads] = useState(() =>
    initialSquads.slice().sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [destinations, setDestinations] = useState<Record<string, string>>(
    () => Object.fromEntries(athletes.map((athlete) => [athlete.id, athlete.destination])),
  );
  const requestId = actionState.nextRequestId ?? initialRequestId;

  const assignments = useMemo(
    () =>
      athletes.flatMap((athlete) => {
        const squadId = destinations[athlete.id];
        if (!squads.some((squad) => squad.id === squadId)) return [];
        const peers = athletes.filter(
          (candidate) => destinations[candidate.id] === squadId,
        );
        return [
          {
            athlete_id: athlete.id,
            squad_id: squadId,
            sort_order: peers.findIndex((candidate) => candidate.id === athlete.id) + 1,
            position_code: null,
            slot_kind: "starter" as const,
          },
        ];
      }),
    [athletes, destinations, squads],
  );
  const exclusions = athletes
    .filter((athlete) => destinations[athlete.id] === EXCLUDED)
    .map((athlete) => athlete.id);
  const unassignedCount = athletes.filter(
    (athlete) => !destinations[athlete.id] || destinations[athlete.id] === UNASSIGNED,
  ).length;

  function updateSquad(id: string, patch: Partial<EventLineupSquad>) {
    setSquads((current) =>
      current.map((squad) => (squad.id === id ? { ...squad, ...patch } : squad)),
    );
  }

  function moveSquad(index: number, direction: -1 | 1) {
    setSquads((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const sourceSquad = next[index];
      const targetSquad = next[target];
      if (!sourceSquad || !targetSquad) return current;
      next[index] = targetSquad;
      next[target] = sourceSquad;
      return next.map((squad, position) => ({ ...squad, sortOrder: position + 1 }));
    });
  }

  function removeSquad(id: string) {
    if (squads.length <= 2) return;
    setSquads((current) =>
      current
        .filter((squad) => squad.id !== id)
        .map((squad, index) => ({ ...squad, sortOrder: index + 1 })),
    );
    setDestinations((current) =>
      Object.fromEntries(
        Object.entries(current).map(([athleteId, destination]) => [
          athleteId,
          destination === id ? UNASSIGNED : destination,
        ]),
      ),
    );
  }

  function addSquad() {
    if (squads.length >= 12) return;
    const palette = ["#0D9488", "#2563EB", "#DC2626", "#D97706", "#7C3AED"];
    setSquads((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: `Time ${current.length + 1}`,
        color: palette[current.length % palette.length] ?? "#0D9488",
        sortOrder: current.length + 1,
      },
    ]);
  }

  const serializedSquads = squads.map((squad, index) => ({
    id: squad.id,
    name: squad.name,
    color: squad.color,
    sort_order: index + 1,
  }));

  return (
    <section
      id="divisao-times"
      aria-labelledby="lineup-editor-title"
      className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
          <UsersRound className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Rascunho privado
          </p>
          <h2 id="lineup-editor-title" className="mt-1 text-xl font-black text-emerald-950">
            Dividir os times
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/80">
            Escolha o destino de cada confirmado. Nada será publicado nesta etapa.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-5 space-y-6">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="squads" value={JSON.stringify(serializedSquads)} />
        <input type="hidden" name="assignments" value={JSON.stringify(assignments)} />
        <input type="hidden" name="exclusions" value={JSON.stringify(exclusions)} />

        <fieldset>
          <legend className="font-black text-slate-900">1. Configure de 2 a 12 times</legend>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Nome, cor e ordem ficam salvos no evento. Use os botões para ordenar.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {squads.map((squad, index) => {
              const memberCount = assignments.filter(
                (assignment) => assignment.squad_id === squad.id,
              ).length;
              return (
                <article key={squad.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={squad.color}
                      onChange={(event) => updateSquad(squad.id, { color: event.target.value })}
                      aria-label={`Cor do ${squad.name || `time ${index + 1}`}`}
                      className="size-12 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                    />
                    <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">
                      Nome do time {index + 1}
                      <input
                        value={squad.name}
                        onChange={(event) => updateSquad(squad.id, { name: event.target.value })}
                        required
                        maxLength={60}
                        className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {memberCount} {memberCount === 1 ? "atleta" : "atletas"}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveSquad(index, -1)} disabled={index === 0} aria-label={`Mover ${squad.name} para cima`} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30">
                        <ArrowUp className="size-4" aria-hidden />
                      </button>
                      <button type="button" onClick={() => moveSquad(index, 1)} disabled={index === squads.length - 1} aria-label={`Mover ${squad.name} para baixo`} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30">
                        <ArrowDown className="size-4" aria-hidden />
                      </button>
                      <button type="button" onClick={() => removeSquad(squad.id)} disabled={squads.length <= 2} aria-label={`Remover ${squad.name}`} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-red-100 text-red-600 disabled:opacity-30">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <button type="button" onClick={addSquad} disabled={squads.length >= 12} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-white px-4 text-sm font-black text-emerald-800 disabled:opacity-40">
            <Plus className="size-4" aria-hidden /> Adicionar time
          </button>
        </fieldset>

        <fieldset>
          <legend className="font-black text-slate-900">2. Distribua os confirmados</legend>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            “Sem time” mantém a decisão pendente. “Fora desta divisão” registra a exclusão.
          </p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {athletes.map((athlete) => (
              <label key={athlete.id} className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">
                  {athlete.shirtNumber ?? "–"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{athlete.name}</span>
                  <span className="block text-xs text-slate-500">Destino na divisão</span>
                </span>
                <select
                  aria-label={`Destino de ${athlete.name}`}
                  value={destinations[athlete.id] ?? UNASSIGNED}
                  onChange={(event) =>
                    setDestinations((current) => ({ ...current, [athlete.id]: event.target.value }))
                  }
                  className="min-h-12 max-w-[48%] rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                >
                  <option value={UNASSIGNED}>Sem time</option>
                  <option value={EXCLUDED}>Fora desta divisão</option>
                  {squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}
                </select>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Summary label="Distribuídos" value={assignments.length} />
          <Summary label="Fora" value={exclusions.length} />
          <Summary label="Sem time" value={unassignedCount} />
        </div>

        {actionState.message ? <ActionMessage state={actionState} /> : null}
        <div className="rounded-2xl bg-white/80 p-3 text-xs leading-5 text-emerald-950">
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> O banco confere novamente RSVP, vínculo ativo e time antes de salvar.</p>
        </div>
        <AsyncSubmitButton pendingLabel="Salvando divisão..." className="min-h-14 w-full text-base">
          <Save aria-hidden /> Salvar rascunho
        </AsyncSubmitButton>
      </form>

      {matchSides.length > 0 && initialSquads.length > 0 ? (
        <div className="mt-6 border-t border-emerald-200 pt-5">
          <h3 className="font-black text-emerald-950">3. Relacione com as partidas</h3>
          <p className="mt-1 text-xs leading-5 text-emerald-900/80">
            Usa a última versão salva. O vínculo não confirma presença e não cria participação real.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {matchSides.map((side) => (
              <MatchSideLinkForm key={`${side.matchId}:${side.sideIndex}`} teamId={teamId} teamSlug={teamSlug} eventId={eventId} side={side} squads={initialSquads} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MatchSideLinkForm({ teamId, teamSlug, eventId, side, squads }: { teamId: string; teamSlug: string; eventId: string; side: EventLineupMatchSide; squads: EventLineupSquad[] }) {
  const [state, action] = useActionState(linkEventLineupSquadToMatchSide, initialActionState);
  const [initialRequestId] = useState(() => crypto.randomUUID());
  return (
    <form action={action} className="rounded-2xl bg-white p-4 shadow-sm">
      <input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="teamSlug" value={teamSlug} /><input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="matchId" value={side.matchId} /><input type="hidden" name="sideIndex" value={side.sideIndex} /><input type="hidden" name="requestId" value={state.nextRequestId ?? initialRequestId} />
      <label className="text-sm font-black text-slate-900">Partida {side.matchOrdinal} · {side.label}
        <select name="squadId" required defaultValue={side.squadId ?? ""} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
          <option value="" disabled>Escolha um time salvo</option>
          {squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}
        </select>
      </label>
      {state.message ? <ActionMessage state={state} compact /> : null}
      <AsyncSubmitButton pendingLabel="Vinculando..." variant="outline" className="mt-3 min-h-12 w-full">Vincular time</AsyncSubmitButton>
    </form>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-white p-3"><p className="text-xl font-black text-slate-900">{value}</p><p className="text-[10px] font-bold text-slate-500">{label}</p></div>;
}

function ActionMessage({ state, compact = false }: { state: EventLineupActionState; compact?: boolean }) {
  return (
    <p role={state.outcome === "error" ? "alert" : "status"} className={`${compact ? "mt-3" : ""} flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${state.outcome === "error" ? "bg-red-50 text-red-800" : "bg-emerald-100 text-emerald-900"}`}>
      {state.outcome === "error" ? <CircleOff className="mt-0.5 size-4 shrink-0" aria-hidden /> : <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}{state.message}
    </p>
  );
}
