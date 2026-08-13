"use client";

import {
  addChampionshipParticipant,
  createChampionship,
  generateLeagueFixtures,
  linkChampionshipFixture,
  publishLeagueChampionship,
  type ChampionshipActionState,
} from "@/app/app/[teamSlug]/championships/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import {
  championshipTiebreakKeys,
  championshipTiebreakLabels,
  expectedLeagueFixtureCount,
  expectedLeagueRoundCount,
} from "@/lib/features/championships/rules";
import {
  INTERNAL_SQUAD_BADGES,
  type InternalSquadBadgeKey,
} from "@/lib/features/team-division/internal-squads";
import { CalendarPlus, Eye, Plus, Send, Trophy } from "lucide-react";
import { useActionState, useState } from "react";

const initialState: ChampionshipActionState = {};

function ActionMessage({ state }: { state: ChampionshipActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.outcome === "error" ? "alert" : "status"}
      className={`rounded-xl p-3 text-sm font-bold ${
        state.outcome === "error"
          ? "bg-red-50 text-red-800"
          : "bg-emerald-50 text-emerald-800"
      }`}
    >
      {state.message}
    </p>
  );
}

function PointsInput({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <input
        type="number"
        name={name}
        required
        min={0}
        max={10}
        defaultValue={defaultValue}
        inputMode="numeric"
        className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-base font-black text-graphite outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      />
    </label>
  );
}

export function CreateChampionshipForm({
  teamId,
  teamSlug,
}: {
  teamId: string;
  teamSlug: string;
}) {
  const [state, action, pending] = useActionState(createChampionship, initialState);
  const [requestId] = useState(() => crypto.randomUUID());

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="requestId" value={requestId} />
      <label className="block text-xs font-bold text-slate-600">
        Nome do campeonato
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          placeholder="Ex.: Liga de Inverno"
          className="mt-1 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-black text-graphite outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
      </label>
      <fieldset>
        <legend className="text-xs font-bold text-slate-600">Pontuação</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <PointsInput name="winPoints" label="Vitória" defaultValue={3} />
          <PointsInput name="drawPoints" label="Empate" defaultValue={1} />
          <PointsInput name="lossPoints" label="Derrota" defaultValue={0} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-xs font-bold text-slate-600">
          Ordem dos desempates
        </legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          A ordem abaixo é fechada nesta primeira versão.
        </p>
        <ol className="mt-2 grid gap-2 sm:grid-cols-2">
          {championshipTiebreakKeys.map((key, index) => (
            <li key={key} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700">
              <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-emerald-700">
                {index + 1}
              </span>
              {championshipTiebreakLabels[key]}
              <input type="hidden" name="tiebreakOrder" value={key} />
            </li>
          ))}
        </ol>
      </fieldset>
      <ActionMessage state={state} />
      <AsyncSubmitButton
        disabled={pending}
        pendingLabel="Criando campeonato..."
        className="min-h-14 w-full text-base"
      >
        <Trophy aria-hidden /> Criar rascunho
      </AsyncSubmitButton>
    </form>
  );
}

export function AddParticipantForm({
  teamId,
  teamSlug,
  championshipId,
  seed,
  internalSquads,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  seed: number;
  internalSquads: { id: string; name: string; color: string; badgeKey: InternalSquadBadgeKey }[];
}) {
  const [state, action, pending] = useActionState(addChampionshipParticipant, initialState);
  const [requestId] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState<"internal" | "external">(
    internalSquads.length ? "internal" : "external",
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="championshipId" value={championshipId} />
      <input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
      <input type="hidden" name="seed" value={seed} />
      <fieldset>
        <legend className="sr-only">Origem do participante</legend>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(["internal", "external"] as const).map((option) => (
            <label
              key={option}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-black ${kind === option ? "bg-white text-graphite shadow-sm" : "text-slate-500"}`}
            >
              <input
                type="radio"
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="sr-only"
              />
              {option === "internal" ? "Time da casa" : "Adversário externo"}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "internal" ? (
        internalSquads.length ? (
          <label className="block text-xs font-bold text-slate-600">
            Equipe interna
            <select name="internalTeamId" required className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite">
              {internalSquads.map((squad) => (
                <option key={squad.id} value={squad.id}>{squad.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Cadastre equipes internas em Ajustes ou use um adversário externo.
          </p>
        )
      ) : (
        <>
          <label className="block text-xs font-bold text-slate-600">
            Nome do adversário
            <input name="externalName" required maxLength={80} placeholder="Ex.: Unidos da Quadra" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite" />
          </label>
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <label className="text-xs font-bold text-slate-600">
              Cor
              <input type="color" name="externalColor" defaultValue="#2563EB" aria-label="Cor do adversário" className="mt-1 size-12 rounded-xl border border-slate-200 bg-white p-1" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Escudo
              <select name="externalBadgeKey" defaultValue="shield" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite">
                {INTERNAL_SQUAD_BADGES.map((badge) => (
                  <option key={badge.key} value={badge.key}>{badge.label}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      <ActionMessage state={state} />
      <AsyncSubmitButton disabled={pending || (kind === "internal" && internalSquads.length === 0)} pendingLabel="Adicionando..." className="min-h-12 w-full">
        <Plus aria-hidden /> Adicionar participante {seed}
      </AsyncSubmitButton>
    </form>
  );
}

export function LeaguePublicationControls({
  teamId,
  teamSlug,
  championshipId,
  participantCount,
  fixtureCount,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  participantCount: number;
  fixtureCount: number;
}) {
  const [generateState, generateAction] = useActionState(generateLeagueFixtures, initialState);
  const [publishState, publishAction] = useActionState(publishLeagueChampionship, initialState);
  const [generateRequestId] = useState(() => crypto.randomUUID());
  const [publishRequestId] = useState(() => crypto.randomUUID());
  const expected = expectedLeagueFixtureCount(participantCount);
  const complete = expected > 0 && fixtureCount === expected;

  const hiddenFields = (requestId: string) => (
    <>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="championshipId" value={championshipId} />
      <input type="hidden" name="requestId" value={requestId} />
    </>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [participantCount, "Participantes"],
          [expectedLeagueRoundCount(participantCount), "Rodadas"],
          [expected, "Confrontos"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xl font-black text-graphite">{value}</p>
            <p className="text-[10px] font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <form action={generateAction}>
        {hiddenFields(generateState.nextRequestId ?? generateRequestId)}
        <AsyncSubmitButton disabled={participantCount < 2} pendingLabel="Gerando confrontos..." variant="outline" className="min-h-12 w-full">
          <Eye aria-hidden /> {fixtureCount ? "Regerar rascunho" : "Gerar para revisar"}
        </AsyncSubmitButton>
      </form>
      <ActionMessage state={generateState} />
      <form action={publishAction}>
        {hiddenFields(publishState.nextRequestId ?? publishRequestId)}
        <AsyncSubmitButton disabled={!complete} pendingLabel="Publicando campeonato..." className="min-h-14 w-full text-base">
          <Send aria-hidden /> Publicar {fixtureCount} confrontos
        </AsyncSubmitButton>
      </form>
      <ActionMessage state={publishState} />
    </div>
  );
}

export function LinkFixtureForm({
  teamId,
  teamSlug,
  championshipId,
  fixtureId,
  matches,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  fixtureId: string;
  matches: { id: string; eventTitle: string; ordinal: number; sideLabels: [string, string] }[];
}) {
  const [state, action, pending] = useActionState(linkChampionshipFixture, initialState);
  const [requestId] = useState(() => crypto.randomUUID());

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="championshipId" value={championshipId} />
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
      {matches.length ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="sr-only" htmlFor={`match-${fixtureId}`}>Partida da agenda</label>
          <select id={`match-${fixtureId}`} name="matchId" required className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-graphite">
            <option value="">Escolha a partida</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.eventTitle} · partida {match.ordinal} · {match.sideLabels.join(" × ")}
              </option>
            ))}
          </select>
          <AsyncSubmitButton disabled={pending} pendingLabel="Vinculando..." size="icon" aria-label="Vincular partida">
            <CalendarPlus aria-hidden />
          </AsyncSubmitButton>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Crie uma partida sem lances na agenda para vinculá-la aqui.
        </p>
      )}
      <ActionMessage state={state} />
    </form>
  );
}
