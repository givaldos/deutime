"use client";

import {
  setProfessionalSchedulingPilotState,
  type ProfessionalSchedulingPilotActionState,
} from "@/app/app/[teamSlug]/settings/professional-scheduling-pilot-actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { CalendarCheck2, Power, RotateCcw } from "lucide-react";
import { useActionState } from "react";

const initialState: ProfessionalSchedulingPilotActionState = {};

export function ProfessionalSchedulingPilotControl({
  teamName,
  teamSlug,
  enabled,
}: {
  teamName: string;
  teamSlug: string;
  enabled: boolean;
}) {
  const [state, action] = useActionState(
    setProfessionalSchedulingPilotState,
    initialState,
  );
  const nextEnabled = !enabled;

  return (
    <section
      className="app-surface border-2 border-emerald-200 p-5 sm:p-7"
      aria-labelledby="professional-scheduling-pilot-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
          <CalendarCheck2 className="size-5" aria-hidden />
        </span>
        <div>
          <p className="app-kicker">Operação restrita</p>
          <h2 id="professional-scheduling-pilot-title" className="mt-1 text-xl font-black tracking-tight text-graphite">
            Piloto da agenda profissional
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Coorte isolada para {teamName}. O rollback mantém URLs, eventos,
            campeonatos, confirmações, decisões e fatos esportivos.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-sm font-bold text-slate-800">Estado do piloto</p>
          <p className="text-xs text-slate-500">
            {enabled
              ? "Agenda profissional ativa somente neste time"
              : "Agenda clássica e campeonatos atuais continuam disponíveis"}
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
            ? "Confirmo o rollback e a verificação posterior com a capacidade desligada."
            : "Confirmo as duas equipes padrão e a observação imediata após ativar."}</span>
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
          {enabled ? "Desligar agenda profissional" : "Ativar somente neste time"}
        </AsyncSubmitButton>
      </form>
    </section>
  );
}
