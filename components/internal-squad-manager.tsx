"use client";

import {
  saveInternalSquads,
  type InternalSquadActionState,
} from "@/app/app/[teamSlug]/settings/internal-squad-actions";
import { InternalSquadBadge } from "@/components/internal-squad-badge";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import {
  INTERNAL_SQUAD_BADGES,
  type InternalSquad,
  type InternalSquadBadgeKey,
} from "@/lib/features/team-division/internal-squads";
import { Plus, Save, Trash2, Trophy } from "lucide-react";
import { useActionState, useState } from "react";

const initialActionState: InternalSquadActionState = {};

export function InternalSquadManager({
  teamId,
  teamSlug,
  initialSquads,
}: {
  teamId: string;
  teamSlug: string;
  initialSquads: InternalSquad[];
}) {
  const [state, action] = useActionState(saveInternalSquads, initialActionState);
  const [initialRequestId] = useState(() => crypto.randomUUID());
  const [squads, setSquads] = useState(() => initialSquads);

  function updateSquad(id: string, patch: Partial<InternalSquad>) {
    setSquads((current) => current.map((squad) => (
      squad.id === id ? { ...squad, ...patch } : squad
    )));
  }

  function addSquad() {
    if (squads.length >= 12) return;
    const palette = ["#DC2626", "#D97706", "#7C3AED", "#0891B2"];
    const badge = INTERNAL_SQUAD_BADGES[squads.length % INTERNAL_SQUAD_BADGES.length];
    setSquads((current) => [...current, {
      id: crypto.randomUUID(),
      name: `Equipe ${current.length + 1}`,
      color: palette[current.length % palette.length] ?? "#0D9488",
      badgeKey: badge?.key ?? "shield",
      sortOrder: current.length + 1,
    }]);
  }

  function removeSquad(id: string) {
    if (squads.length <= 2) return;
    setSquads((current) => current
      .filter((squad) => squad.id !== id)
      .map((squad, index) => ({ ...squad, sortOrder: index + 1 })));
  }

  const serialized = squads.map((squad, index) => ({
    id: squad.id,
    name: squad.name,
    color: squad.color,
    badge_key: squad.badgeKey,
    sort_order: index + 1,
  }));

  return (
    <section className="app-surface p-5 sm:p-7" aria-labelledby="internal-squads-title">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <Trophy className="size-5" aria-hidden />
        </span>
        <div>
          <p className="app-kicker">Equipes internas</p>
          <h2 id="internal-squads-title" className="mt-1 text-xl font-black text-graphite">
            Os times da casa
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Eles aparecem automaticamente na divisão e mantêm a mesma identidade ao longo dos jogos.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="requestId" value={state.nextRequestId ?? initialRequestId} />
        <input type="hidden" name="squads" value={JSON.stringify(serialized)} />

        {squads.map((squad, index) => (
          <article key={squad.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <InternalSquadBadge badgeKey={squad.badgeKey} color={squad.color} className="size-14 shrink-0" />
              <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">
                Nome da equipe {index + 1}
                <input
                  value={squad.name}
                  onChange={(event) => updateSquad(squad.id, { name: event.target.value })}
                  maxLength={60}
                  required
                  className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-black text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </label>
              <input
                type="color"
                value={squad.color}
                onChange={(event) => updateSquad(squad.id, { color: event.target.value })}
                aria-label={`Cor da equipe ${squad.name}`}
                className="size-12 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              />
            </div>
            <fieldset className="mt-3">
              <legend className="text-xs font-bold text-slate-600">Escolha o escudo</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {INTERNAL_SQUAD_BADGES.map((badge) => (
                  <label key={badge.key} className={`cursor-pointer rounded-xl border p-2 text-center ${squad.badgeKey === badge.key ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <input
                      type="radio"
                      name={`badge-${squad.id}`}
                      value={badge.key}
                      checked={squad.badgeKey === badge.key}
                      onChange={() => updateSquad(squad.id, { badgeKey: badge.key as InternalSquadBadgeKey })}
                      className="sr-only"
                    />
                    <InternalSquadBadge badgeKey={badge.key} color={squad.color} className="mx-auto size-9" />
                    <span className="mt-1 block text-[10px] font-bold text-slate-600">{badge.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              onClick={() => removeSquad(squad.id)}
              disabled={squads.length <= 2}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-red-700 disabled:opacity-30"
            >
              <Trash2 className="size-4" aria-hidden /> Remover equipe
            </button>
          </article>
        ))}

        <button
          type="button"
          onClick={addSquad}
          disabled={squads.length >= 12}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden /> Adicionar equipe
        </button>

        {state.message ? (
          <p role={state.outcome === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm font-bold ${state.outcome === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
            {state.message}
          </p>
        ) : null}

        <AsyncSubmitButton pendingLabel="Salvando equipes..." className="min-h-14 w-full text-base">
          <Save aria-hidden /> Salvar equipes
        </AsyncSubmitButton>
      </form>
    </section>
  );
}
