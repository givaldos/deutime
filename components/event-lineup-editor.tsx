"use client";

import {
  linkEventLineupSquadToMatchSide,
  publishEventLineup,
  saveAndPublishEventLineup,
  saveEventLineupDraft,
  type EventLineupActionState,
  withdrawEventLineupPublication,
} from "@/app/app/[teamSlug]/events/lineup-actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { InternalSquadBadge } from "@/components/internal-squad-badge";
import { suggestAutomaticDestinations } from "@/lib/features/team-division/automatic";
import type { InternalSquadBadgeKey } from "@/lib/features/team-division/internal-squads";
import {
  BadgeCheck,
  CircleOff,
  Globe2,
  Save,
  Sparkles,
  Undo2,
  UsersRound,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type EventLineupSquad = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  internalTeamId: string | null;
  badgeKey: InternalSquadBadgeKey;
};

export type EventLineupAthlete = {
  id: string;
  name: string;
  shirtNumber: number | null;
  destination: string;
  isGoalkeeper: boolean;
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
  publicId,
  initialRequestId,
  initialSquads,
  athletes,
  matchSides,
  canPublish = false,
  activeRevision = null,
  hasSavedDraft = false,
  autoSuggestOnLoad = false,
}: {
  teamId: string;
  teamSlug: string;
  eventId: string;
  publicId?: string;
  initialRequestId: string;
  initialSquads: EventLineupSquad[];
  athletes: EventLineupAthlete[];
  matchSides: EventLineupMatchSide[];
  canPublish?: boolean;
  activeRevision?: { revision: number; publishedAt: string } | null;
  hasSavedDraft?: boolean;
  autoSuggestOnLoad?: boolean;
}) {
  const router = useRouter();
  const [squads] = useState(() =>
    initialSquads.slice().sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [isDirty, setIsDirty] = useState(!hasSavedDraft);
  const [actionState, formAction] = useActionState(
    async (previousState: EventLineupActionState, formData: FormData) => {
      const nextState = canPublish && publicId
        ? await saveAndPublishEventLineup(previousState, formData)
        : await saveEventLineupDraft(previousState, formData);
      if (nextState.outcome === "success") {
        setIsDirty(false);
        if (nextState.published) router.refresh();
      }
      return nextState;
    },
    initialActionState,
  );
  const [destinations, setDestinations] = useState<Record<string, string>>(() => {
    const initial = Object.fromEntries(
      athletes.map((athlete) => [athlete.id, athlete.destination]),
    );
    if (!autoSuggestOnLoad || athletes.some((athlete) => athlete.destination !== UNASSIGNED)) {
      return initial;
    }
    return {
      ...initial,
      ...suggestAutomaticDestinations(eventId, squads, athletes),
    };
  });
  const requestId = actionState.nextRequestId ?? initialRequestId;
  const [initialPublicationRequestId] = useState(() => crypto.randomUUID());
  const publicationRequestId =
    actionState.nextPublicationRequestId ?? initialPublicationRequestId;

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

  function automaticallyDistribute() {
    const eligible = athletes.filter(
      (athlete) => destinations[athlete.id] !== EXCLUDED,
    );
    const suggestion = suggestAutomaticDestinations(eventId, squads, eligible);
    setIsDirty(true);
    setDestinations((current) => ({ ...current, ...suggestion }));
  }

  function moveAthleteByTouch(athleteId: string) {
    setIsDirty(true);
    setDestinations((current) => {
      const currentSquadIndex = squads.findIndex(
        (squad) => squad.id === current[athleteId],
      );
      if (currentSquadIndex >= 0) {
        return {
          ...current,
          [athleteId]: squads[(currentSquadIndex + 1) % squads.length]?.id ?? UNASSIGNED,
        };
      }

      const target = squads.reduce((best, candidate) => {
        const candidateCount = athletes.filter(
          (athlete) => current[athlete.id] === candidate.id,
        ).length;
        const bestCount = athletes.filter(
          (athlete) => current[athlete.id] === best.id,
        ).length;
        return candidateCount < bestCount ? candidate : best;
      });
      return { ...current, [athleteId]: target.id };
    });
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
            Divisão do jogo
          </p>
          <h2 id="lineup-editor-title" className="mt-1 text-xl font-black text-emerald-950">
            Dividir os times
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/80">
            A sugestão já está pronta. Ajuste quem precisar e salve a escalação.
            {canPublish && publicId ? " O link público será atualizado automaticamente." : ""}
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-5 space-y-6">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="eventId" value={eventId} />
        {publicId ? <input type="hidden" name="publicId" value={publicId} /> : null}
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="publicationRequestId" value={publicationRequestId} />
        <input type="hidden" name="squads" value={JSON.stringify(serializedSquads)} />
        <input type="hidden" name="assignments" value={JSON.stringify(assignments)} />
        <input type="hidden" name="exclusions" value={JSON.stringify(exclusions)} />

        <fieldset>
          <legend className="font-black text-slate-900">Ajuste se precisar</legend>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            A sugestão equilibra quantidade e espalha goleiros. Toque em uma pessoa para movê-la ao próximo time.
          </p>
          <button type="button" onClick={automaticallyDistribute} disabled={athletes.length === 0} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white disabled:opacity-40">
            <Sparkles className="size-4" aria-hidden /> Refazer divisão automática
          </button>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {squads.map((squad) => {
              const members = athletes.filter(
                (athlete) => destinations[athlete.id] === squad.id,
              );
              return (
                <article key={squad.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `5px solid ${squad.color}` }}>
                    <div className="flex items-center gap-2">
                      <InternalSquadBadge badgeKey={squad.badgeKey} color={squad.color} className="size-9" />
                      <h3 className="font-black text-slate-900">{squad.name}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{members.length}</span>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 p-3">
                    {members.length ? members.map((athlete) => (
                      <AthleteTouchCard key={athlete.id} athlete={athlete} nextSquadName={squads[(squads.findIndex((item) => item.id === squad.id) + 1) % squads.length]?.name ?? "outro time"} onMove={() => moveAthleteByTouch(athlete.id)} onExclude={() => { setIsDirty(true); setDestinations((current) => ({ ...current, [athlete.id]: EXCLUDED })); }} />
                    )) : <p className="p-3 text-center text-xs text-slate-500">Nenhum atleta neste time.</p>}
                  </div>
                </article>
              );
            })}
          </div>

          {athletes.some((athlete) => !destinations[athlete.id] || destinations[athlete.id] === UNASSIGNED) ? (
            <div className="mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3">
              <h3 className="text-sm font-black text-amber-950">Sem time</h3>
              <div className="mt-2 space-y-2">
                {athletes.filter((athlete) => !destinations[athlete.id] || destinations[athlete.id] === UNASSIGNED).map((athlete) => (
                  <AthleteTouchCard key={athlete.id} athlete={athlete} nextSquadName="o time com menos atletas" onMove={() => moveAthleteByTouch(athlete.id)} onExclude={() => { setIsDirty(true); setDestinations((current) => ({ ...current, [athlete.id]: EXCLUDED })); }} />
                ))}
              </div>
            </div>
          ) : null}

          {exclusions.length ? (
            <div className="mt-3 rounded-2xl bg-slate-100 p-3">
              <h3 className="text-sm font-black text-slate-800">Fora desta divisão</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {athletes.filter((athlete) => destinations[athlete.id] === EXCLUDED).map((athlete) => (
                  <button key={athlete.id} type="button" onClick={() => moveAthleteByTouch(athlete.id)} className="min-h-11 rounded-xl bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
                    Recolocar {athlete.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <details className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-black text-slate-700">Escolher time manualmente</summary>
            <div className="mt-2 grid gap-2">
              {athletes.map((athlete) => (
                <label key={athlete.id} className="flex items-center justify-between gap-3 text-sm font-bold text-slate-800">
                  <span className="truncate">{athlete.name}</span>
                  <select aria-label={`Destino de ${athlete.name}`} value={destinations[athlete.id] ?? UNASSIGNED} onChange={(event) => { setIsDirty(true); setDestinations((current) => ({ ...current, [athlete.id]: event.target.value })); }} className="min-h-11 max-w-[55%] rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold">
                    <option value={UNASSIGNED}>Sem time</option>
                    <option value={EXCLUDED}>Fora desta divisão</option>
                    {squads.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </details>
        </fieldset>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Summary label="Distribuídos" value={assignments.length} />
          <Summary label="Fora" value={exclusions.length} />
          <Summary label="Sem time" value={unassignedCount} />
        </div>

        {actionState.message ? <ActionMessage state={actionState} /> : null}
        {isDirty ? (
          <div className="fixed inset-x-3 bottom-[5.5rem] z-40 mx-auto max-w-md rounded-2xl bg-white/95 p-2 shadow-[0_-8px_30px_rgba(15,23,42,0.14)] backdrop-blur sm:static sm:max-w-none sm:bg-transparent sm:p-0 sm:shadow-none">
            <AsyncSubmitButton pendingLabel="Salvando escalação..." className="min-h-14 w-full text-base">
              <Save aria-hidden /> Salvar escalação
            </AsyncSubmitButton>
          </div>
        ) : null}
      </form>

      {publicId && !isDirty && (hasSavedDraft || actionState.outcome === "success") ? (
        <LineupPublicationPanel
          teamId={teamId}
          teamSlug={teamSlug}
          eventId={eventId}
          publicId={publicId}
          canPublish={canPublish}
          activeRevision={activeRevision}
          justPublished={actionState.published === true}
        />
      ) : null}

      {matchSides.length > 0 && initialSquads.length > 0 ? (
        <div className="mt-6 border-t border-emerald-200 pt-5">
          <h3 className="font-black text-emerald-950">Partidas</h3>
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

function LineupPublicationPanel({
  teamId,
  teamSlug,
  eventId,
  publicId,
  canPublish,
  activeRevision,
  justPublished,
}: {
  teamId: string;
  teamSlug: string;
  eventId: string;
  publicId: string;
  canPublish: boolean;
  activeRevision: { revision: number; publishedAt: string } | null;
  justPublished: boolean;
}) {
  const [publishState, publishAction] = useActionState(
    publishEventLineup,
    initialActionState,
  );
  const [withdrawState, withdrawAction] = useActionState(
    withdrawEventLineupPublication,
    initialActionState,
  );
  const [publishRequestId] = useState(() => crypto.randomUUID());
  const [withdrawRequestId] = useState(() => crypto.randomUUID());
  const fields = { teamId, teamSlug, eventId, publicId };

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
          <Globe2 className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-black text-slate-900">
            {activeRevision
              ? `Divisão compartilhada · versão ${activeRevision.revision}`
              : justPublished
                ? "Divisão publicada"
                : "Divisão salva anteriormente"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            A página e a imagem mostram somente nomes de atletas que autorizaram a divulgação esportiva.
          </p>
        </div>
      </div>

      {canPublish ? (
        <div className="mt-4 grid gap-2">
          {!activeRevision && !justPublished ? (
            <form action={publishAction}>
              {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
              <input type="hidden" name="requestId" value={publishState.nextRequestId ?? publishRequestId} />
              <AsyncSubmitButton pendingLabel="Publicando..." className="min-h-12 w-full">
                <Globe2 aria-hidden /> Publicar divisão existente
              </AsyncSubmitButton>
              {publishState.message ? <ActionMessage state={publishState} compact /> : null}
            </form>
          ) : null}
          {activeRevision ? (
            <form action={withdrawAction}>
              {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
              <input type="hidden" name="requestId" value={withdrawState.nextRequestId ?? withdrawRequestId} />
              <AsyncSubmitButton pendingLabel="Retirando..." variant="outline" className="min-h-12 w-full">
                <Undo2 aria-hidden /> Ocultar publicação
              </AsyncSubmitButton>
              {withdrawState.message ? <ActionMessage state={withdrawState} compact /> : null}
            </form>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Como manager, suas alterações ficam em rascunho. Owner ou admin salva e publica para a galera.
        </p>
      )}
    </div>
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

function AthleteTouchCard({
  athlete,
  nextSquadName,
  onMove,
  onExclude,
}: {
  athlete: EventLineupAthlete;
  nextSquadName: string;
  onMove: () => void;
  onExclude: () => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-2 rounded-xl bg-slate-50 p-2">
      <button type="button" onClick={onMove} aria-label={`Mover ${athlete.name} para ${nextSquadName}`} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-slate-600 shadow-sm">{athlete.shirtNumber ?? "–"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-slate-900">{athlete.name}</span>
          <span className="block truncate text-[11px] font-semibold text-slate-500">Mover → {nextSquadName}</span>
        </span>
      </button>
      <button type="button" onClick={onExclude} aria-label={`Retirar ${athlete.name} desta divisão`} className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
        <CircleOff className="size-4" aria-hidden />
      </button>
    </div>
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
