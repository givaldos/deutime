"use client";

import {
  setChampionshipPilotState,
  type ChampionshipPilotActionState,
} from "@/app/app/[teamSlug]/settings/championship-pilot-actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { Power, RotateCcw, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

const initialState: ChampionshipPilotActionState = {};

export function ChampionshipPilotControl({
  teamName,
  teamSlug,
  enabled,
}: {
  teamName: string;
  teamSlug: string;
  enabled: boolean;
}) {
  const [state, action] = useActionState(
    setChampionshipPilotState,
    initialState,
  );
  const nextEnabled = !enabled;

  return (
    <section
      className="app-surface border-2 border-violet-200 p-5 sm:p-7"
      aria-labelledby="championship-pilot-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-800">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <p className="app-kicker">Operação restrita</p>
          <h2 id="championship-pilot-title" className="mt-1 text-xl font-black tracking-tight text-graphite">
            Piloto de campeonatos
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Teste isolado para {teamName}. A desativação oculta campeonatos sem
            apagar confrontos, partidas ou súmulas.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-sm font-bold text-slate-800">Estado do piloto</p>
          <p className="text-xs text-slate-500">
            {enabled ? "Campeonatos ativos neste time" : "Agenda e partidas continuam disponíveis"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
          {enabled ? "Ativo" : "Desligado"}
        </span>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="enabled" value={String(nextEnabled)} />
        <label className="flex min-h-12 items-start gap-3 rounded-2xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            name="confirmation"
            value="confirmed"
            required
            className="mt-0.5 size-5 rounded border-slate-300"
          />
          <span>{enabled
            ? "Confirmo a desativação e a verificação posterior com o recurso desligado."
            : "Confirmo a verificação antes da ativação e a observação imediata."}</span>
        </label>

        {state.message ? (
          <p role={state.outcome === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm font-semibold ${state.outcome === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
            {state.message}
          </p>
        ) : null}

        <AsyncSubmitButton
          pendingLabel={nextEnabled ? "Ativando piloto..." : "Desativando piloto..."}
          variant={enabled ? "destructive" : "default"}
          className="min-h-12 w-full sm:w-auto"
        >
          {enabled ? <RotateCcw aria-hidden /> : <Power aria-hidden />}
          {enabled ? "Desligar campeonatos" : "Ativar somente neste time"}
        </AsyncSubmitButton>
      </form>
    </section>
  );
}
