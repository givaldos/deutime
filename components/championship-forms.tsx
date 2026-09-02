"use client";

import {
  addChampionshipParticipant,
  advanceChampionshipGroups,
  createChampionship,
  decideChampionshipQualifier,
  generateChampionshipFixtures,
  linkChampionshipFixture,
  publishChampionshipFormat,
  reopenChampionshipRegulation,
  releaseChampionshipFixture,
  resolveChampionshipFixture,
  withdrawChampionshipParticipant,
  updateChampionshipRegulation,
  type ChampionshipActionState,
} from "@/app/app/[teamSlug]/championships/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { createRequestId } from "@/lib/client/request-id";
import {
  championshipTiebreakKeys,
  championshipTiebreakLabels,
  expectedGroupFixtureCount,
  expectedKnockoutFixtureCount,
  expectedKnockoutRoundCount,
  expectedLeagueFixtureCount,
  expectedLeagueRoundCount,
  type ChampionshipFormat,
} from "@/lib/features/championships/rules";
import {
  INTERNAL_SQUAD_BADGES,
  type InternalSquad,
  type InternalSquadBadgeKey,
} from "@/lib/features/team-division/internal-squads";
import { ArrowDown, ArrowUp, CalendarPlus, Eye, Plus, RotateCcw, Send, Trophy } from "lucide-react";
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

function TiebreakOrderEditor({
  initialOrder = championshipTiebreakKeys,
}: {
  initialOrder?: readonly (typeof championshipTiebreakKeys)[number][];
}) {
  const [order, setOrder] = useState([...initialOrder]);
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      const currentItem = next[index];
      const targetItem = next[target];
      if (!currentItem || !targetItem) return current;
      next[index] = targetItem;
      next[target] = currentItem;
      return next;
    });
  };

  return (
    <fieldset>
      <legend className="text-xs font-bold text-slate-600">
        Ordem dos desempates
      </legend>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Pontos vêm primeiro. Em confronto direto, o sistema considera somente o mini-torneio entre as equipes que ainda estiverem empatadas.
      </p>
      <ol className="mt-3 space-y-2">
        {order.map((key, index) => (
          <li key={key} className="flex min-h-14 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-black text-emerald-800">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm font-black text-graphite">
              {championshipTiebreakLabels[key]}
            </span>
            <input type="hidden" name="tiebreakOrder" value={key} />
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Subir ${championshipTiebreakLabels[key]}`}
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30"
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === order.length - 1}
              aria-label={`Descer ${championshipTiebreakLabels[key]}`}
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30"
            >
              <ArrowDown className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}

export function CreateChampionshipForm({
  teamId,
  teamSlug,
  professionalSchedulingEnabled = false,
  internalSquads = [],
}: {
  teamId: string;
  teamSlug: string;
  professionalSchedulingEnabled?: boolean;
  internalSquads?: InternalSquad[];
}) {
  const [state, action, pending] = useActionState(createChampionship, initialState);
  const [requestId] = useState(createRequestId);
  const [format, setFormat] = useState<ChampionshipFormat>("league");

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="requestId" value={requestId} />
      <label className="block text-xs font-bold text-slate-600">
        Formato
        <select
          name="format"
          value={format}
          onChange={(event) => setFormat(event.target.value as ChampionshipFormat)}
          className="mt-1 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-black text-graphite outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        >
          <option value="league">Pontos corridos</option>
          <option value="groups_knockout">Grupos + mata-mata</option>
          <option value="knockout">Mata-mata</option>
        </select>
      </label>
      {professionalSchedulingEnabled ? (
        <fieldset>
          <legend className="text-xs font-bold text-slate-600">
            Equipes participantes
          </legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            As equipes ativas já estão selecionadas. Você pode retirar alguma antes de criar o rascunho.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {internalSquads.map((squad) => (
              <label key={squad.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50">
                <input
                  type="checkbox"
                  name="internalTeamIds"
                  value={squad.id}
                  defaultChecked
                  className="size-5 accent-emerald-700"
                />
                <span className="min-w-0 truncate text-sm font-black text-graphite">
                  {squad.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
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
      {format === "groups_knockout" ? (
        <fieldset>
          <legend className="text-xs font-bold text-slate-600">Fase de grupos</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">
              Grupos
              <select name="groupCount" defaultValue="2" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-black text-graphite">
                {[2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Avançam por grupo
              <select name="qualifiersPerGroup" defaultValue="1" className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-black text-graphite">
                <option value="1">1 equipe</option>
                <option value="2">2 equipes</option>
              </select>
            </label>
          </div>
        </fieldset>
      ) : null}
      {professionalSchedulingEnabled ? (
        <TiebreakOrderEditor />
      ) : (
        <fieldset>
          <legend className="text-xs font-bold text-slate-600">Ordem dos desempates</legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">A ordem abaixo é fechada nesta versão.</p>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2">
            {championshipTiebreakKeys.map((key, index) => (
              <li key={key} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700">
                <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-emerald-700">{index + 1}</span>
                {championshipTiebreakLabels[key]}
                <input type="hidden" name="tiebreakOrder" value={key} />
              </li>
            ))}
          </ol>
        </fieldset>
      )}
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
  groupCount,
  internalSquads,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  seed: number;
  groupCount?: number | null;
  internalSquads: { id: string; name: string; color: string; badgeKey: InternalSquadBadgeKey }[];
}) {
  const [state, action, pending] = useActionState(addChampionshipParticipant, initialState);
  const [requestId] = useState(createRequestId);
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
      {groupCount ? (
        <label className="block text-xs font-bold text-slate-600">
          Grupo
          <select name="groupNumber" required defaultValue={((seed - 1) % groupCount) + 1} className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite">
            {Array.from({ length: groupCount }, (_, index) => (
              <option key={index + 1} value={index + 1}>Grupo {String.fromCharCode(65 + index)}</option>
            ))}
          </select>
        </label>
      ) : null}
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

export function ChampionshipPublicationControls({
  teamId,
  teamSlug,
  championshipId,
  format,
  participantCount,
  fixtureCount,
  groupSizes = [],
  qualifiersPerGroup = 1,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  format: ChampionshipFormat;
  participantCount: number;
  fixtureCount: number;
  groupSizes?: number[];
  qualifiersPerGroup?: number;
}) {
  const [generateState, generateAction] = useActionState(generateChampionshipFixtures, initialState);
  const [publishState, publishAction] = useActionState(publishChampionshipFormat, initialState);
  const [generateRequestId] = useState(createRequestId);
  const [publishRequestId] = useState(createRequestId);
  const expected = format === "league"
    ? expectedLeagueFixtureCount(participantCount)
    : format === "groups_knockout"
      ? groupSizes.every((size) => size > qualifiersPerGroup)
        ? expectedGroupFixtureCount(groupSizes)
        : 0
      : expectedKnockoutFixtureCount(participantCount);
  const rounds = format === "league"
    ? expectedLeagueRoundCount(participantCount)
    : format === "knockout"
      ? expectedKnockoutRoundCount(participantCount)
      : groupSizes.length
        ? Math.max(...groupSizes.map(expectedLeagueRoundCount))
        : 0;
  const complete = expected > 0 && fixtureCount === expected;

  const hiddenFields = (requestId: string) => (
    <>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="championshipId" value={championshipId} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="format" value={format} />
    </>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [participantCount, "Participantes"],
          [rounds, format === "groups_knockout" ? "Rodadas por grupo" : format === "league" ? "Rodadas" : "Fases"],
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
        <AsyncSubmitButton disabled={expected === 0} pendingLabel="Gerando confrontos..." variant="outline" className="min-h-12 w-full">
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
  const [requestId] = useState(createRequestId);

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

function ChampionshipHiddenFields({
  teamId,
  teamSlug,
  championshipId,
  requestId,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  requestId: string;
}) {
  return (
    <>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="championshipId" value={championshipId} />
      <input type="hidden" name="requestId" value={requestId} />
    </>
  );
}

export function ChampionshipRegulationEditor({
  teamId,
  teamSlug,
  championshipId,
  winPoints,
  drawPoints,
  lossPoints,
  tiebreakOrder,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  tiebreakOrder: readonly (typeof championshipTiebreakKeys)[number][];
}) {
  const [state, action, pending] = useActionState(updateChampionshipRegulation, initialState);
  const [requestId] = useState(createRequestId);

  return (
    <form action={action} className="space-y-4">
      <ChampionshipHiddenFields
        teamId={teamId}
        teamSlug={teamSlug}
        championshipId={championshipId}
        requestId={state.nextRequestId ?? requestId}
      />
      <fieldset>
        <legend className="text-xs font-bold text-slate-600">Pontuação principal</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <PointsInput name="winPoints" label="Vitória" defaultValue={winPoints} />
          <PointsInput name="drawPoints" label="Empate" defaultValue={drawPoints} />
          <PointsInput name="lossPoints" label="Derrota" defaultValue={lossPoints} />
        </div>
      </fieldset>
      <TiebreakOrderEditor initialOrder={tiebreakOrder} />
      <ActionMessage state={state} />
      <AsyncSubmitButton disabled={pending} pendingLabel="Salvando regulamento..." className="min-h-12 w-full">
        Salvar regulamento
      </AsyncSubmitButton>
    </form>
  );
}

export function ReopenChampionshipRegulationControl({
  teamId,
  teamSlug,
  championshipId,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
}) {
  const [state, action, pending] = useActionState(reopenChampionshipRegulation, initialState);
  const [requestId] = useState(createRequestId);
  return (
    <form action={action} className="space-y-3">
      <ChampionshipHiddenFields
        teamId={teamId}
        teamSlug={teamSlug}
        championshipId={championshipId}
        requestId={state.nextRequestId ?? requestId}
      />
      <p className="text-xs leading-5 text-slate-500">
        Disponível somente antes do primeiro fato esportivo. A página pública será recolhida e a versão atual permanecerá no histórico.
      </p>
      <ActionMessage state={state} />
      <AsyncSubmitButton disabled={pending} pendingLabel="Reabrindo regulamento..." variant="outline" className="min-h-12 w-full">
        <RotateCcw aria-hidden /> Reabrir para editar
      </AsyncSubmitButton>
    </form>
  );
}

export function QualifierDecisionForm({
  teamId,
  teamSlug,
  championshipId,
  groupNumber,
  qualifierPosition,
  candidates,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  groupNumber: number;
  qualifierPosition: number;
  candidates: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(decideChampionshipQualifier, initialState);
  const [requestId] = useState(createRequestId);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <ChampionshipHiddenFields teamId={teamId} teamSlug={teamSlug} championshipId={championshipId} requestId={state.nextRequestId ?? requestId} />
      <input type="hidden" name="groupNumber" value={groupNumber} />
      <input type="hidden" name="qualifierPosition" value={qualifierPosition} />
      <p className="text-sm font-black text-amber-950">
        Decidir {qualifierPosition}ª vaga do grupo {String.fromCharCode(64 + groupNumber)}
      </p>
      <label className="block text-xs font-bold text-amber-900">
        Quem avança
        <select name="participantId" required defaultValue="" className="mt-1 min-h-12 w-full rounded-xl border border-amber-200 bg-white px-3 text-base font-bold text-graphite">
          <option value="" disabled>Escolha a equipe</option>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold text-amber-900">
        Motivo auditável
        <textarea name="reason" required minLength={3} maxLength={500} rows={3} placeholder="Ex.: confronto de desempate previsto pela organização" className="mt-1 w-full rounded-xl border border-amber-200 bg-white p-3 text-base text-graphite" />
      </label>
      <ActionMessage state={state} />
      <AsyncSubmitButton disabled={pending} pendingLabel="Registrando decisão..." className="min-h-12 w-full">
        Confirmar vaga
      </AsyncSubmitButton>
    </form>
  );
}

export function GroupAdvanceControl({
  teamId,
  teamSlug,
  championshipId,
  disabled,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(advanceChampionshipGroups, initialState);
  const [requestId] = useState(createRequestId);
  return (
    <form action={action} className="space-y-3">
      <ChampionshipHiddenFields teamId={teamId} teamSlug={teamSlug} championshipId={championshipId} requestId={state.nextRequestId ?? requestId} />
      <AsyncSubmitButton disabled={disabled || pending} pendingLabel="Montando mata-mata..." className="min-h-14 w-full text-base">
        Montar mata-mata com classificados
      </AsyncSubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function KnockoutResolutionForm({
  teamId,
  teamSlug,
  championshipId,
  fixtureId,
  sides,
  matchStatus,
  currentWinnerId,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  fixtureId: string;
  sides: { id: string; name: string }[];
  matchStatus?: string;
  currentWinnerId?: string | null;
}) {
  const [scoreState, scoreAction, scorePending] = useActionState(resolveChampionshipFixture, initialState);
  const [manualState, manualAction, manualPending] = useActionState(resolveChampionshipFixture, initialState);
  const [scoreRequestId] = useState(createRequestId);
  const [manualRequestId] = useState(createRequestId);
  const [resolution, setResolution] = useState(
    matchStatus === "finalized" ? "penalties" : "walkover",
  );

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      {matchStatus === "finalized" ? (
        <form action={scoreAction} className="space-y-2">
          <ChampionshipHiddenFields teamId={teamId} teamSlug={teamSlug} championshipId={championshipId} requestId={scoreState.nextRequestId ?? scoreRequestId} />
          <input type="hidden" name="fixtureId" value={fixtureId} />
          <input type="hidden" name="resolution" value="score" />
          <AsyncSubmitButton disabled={scorePending} pendingLabel="Lendo a súmula..." variant="outline" className="min-h-11 w-full">
            Confirmar vencedor pelo placar
          </AsyncSubmitButton>
          <ActionMessage state={scoreState} />
        </form>
      ) : null}
      <details className="rounded-xl bg-slate-50 p-3" open={!matchStatus && !currentWinnerId}>
        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-black text-slate-700">
          {currentWinnerId ? "Corrigir decisão" : "Decisão manual, empate ou W.O."}
        </summary>
        <form action={manualAction} className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <ChampionshipHiddenFields teamId={teamId} teamSlug={teamSlug} championshipId={championshipId} requestId={manualState.nextRequestId ?? manualRequestId} />
          <input type="hidden" name="fixtureId" value={fixtureId} />
          <label className="block text-xs font-bold text-slate-600">
            Quem avança
            <select name="winnerId" required defaultValue={currentWinnerId ?? ""} className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite">
              <option value="" disabled>Escolha a equipe</option>
              {sides.map((side) => <option key={side.id} value={side.id}>{side.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Como foi decidido
            <select name="resolution" value={resolution} onChange={(event) => setResolution(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-graphite">
              {matchStatus === "finalized" ? <option value="penalties">Pênaltis</option> : null}
              <option value="walkover">W.O.</option>
              <option value="regulation">Critério do regulamento</option>
              <option value="administrative">Decisão administrativa</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Motivo
            <textarea name="reason" required minLength={3} maxLength={500} rows={3} placeholder="Registre o motivo sem alterar o placar" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-base text-graphite" />
          </label>
          <ActionMessage state={manualState} />
          <AsyncSubmitButton disabled={manualPending} pendingLabel="Atualizando chave..." className="min-h-12 w-full">
            Confirmar quem avança
          </AsyncSubmitButton>
        </form>
      </details>
    </div>
  );
}

export function ReleaseFixtureForm({
  teamId,
  teamSlug,
  championshipId,
  fixtureId,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  fixtureId: string;
}) {
  const [state, action, pending] = useActionState(releaseChampionshipFixture, initialState);
  const [requestId] = useState(createRequestId);
  return (
    <details className="mt-3 rounded-xl border border-dashed border-slate-200 p-3">
      <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-black text-slate-600">
        Liberar para remarcação
      </summary>
      <form action={action} className="mt-3 space-y-3 border-t border-slate-100 pt-3">
        <ChampionshipHiddenFields teamId={teamId} teamSlug={teamSlug} championshipId={championshipId} requestId={state.nextRequestId ?? requestId} />
        <input type="hidden" name="fixtureId" value={fixtureId} />
        <label className="block text-xs font-bold text-slate-600">
          Motivo da remarcação
          <textarea name="reason" required minLength={3} maxLength={500} rows={3} placeholder="Ex.: mudança de data acordada entre as equipes" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-base text-graphite" />
        </label>
        <p className="text-xs text-slate-500">Disponível apenas antes do início e sem súmula ou escalação registrada.</p>
        <ActionMessage state={state} />
        <AsyncSubmitButton disabled={pending} pendingLabel="Liberando partida..." variant="outline" className="min-h-12 w-full">
          Confirmar remarcação
        </AsyncSubmitButton>
      </form>
    </details>
  );
}

export function WithdrawParticipantForm({
  teamId,
  teamSlug,
  championshipId,
  participantId,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  participantId: string;
}) {
  const [state, action, pending] = useActionState(withdrawChampionshipParticipant, initialState);
  const [requestId] = useState(createRequestId);
  return (
    <details className="mt-2 rounded-xl border border-dashed border-slate-200 px-3">
      <summary className="min-h-11 cursor-pointer list-none py-3 text-xs font-black text-slate-600">
        Registrar retirada
      </summary>
      <form action={action} className="space-y-3 border-t border-slate-100 py-3">
        <ChampionshipHiddenFields teamId={teamId} teamSlug={teamSlug} championshipId={championshipId} requestId={state.nextRequestId ?? requestId} />
        <input type="hidden" name="participantId" value={participantId} />
        <label className="block text-xs font-bold text-slate-600">
          Motivo da retirada
          <textarea name="reason" required minLength={3} maxLength={500} rows={3} placeholder="Ex.: equipe desistiu da competição" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-base text-graphite" />
        </label>
        <p className="text-xs text-slate-500">Jogos concluídos permanecem no histórico. A operação bloqueia se uma dependência já começou.</p>
        <ActionMessage state={state} />
        <AsyncSubmitButton disabled={pending} pendingLabel="Registrando retirada..." variant="outline" className="min-h-12 w-full">
          Confirmar retirada
        </AsyncSubmitButton>
      </form>
    </details>
  );
}
