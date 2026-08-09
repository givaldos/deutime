"use client";

import {
  updateTeamWhatsAppReminderSettings,
  type ReminderSettingsActionState,
} from "@/app/app/[teamSlug]/settings/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { BellRing } from "lucide-react";
import { useActionState } from "react";

const initialState: ReminderSettingsActionState = {};

export function WhatsAppReminderSettingsForm({
  teamId,
  teamSlug,
  firstHours,
  secondHours,
}: {
  teamId: string;
  teamSlug: string;
  firstHours: number;
  secondHours: number;
}) {
  const [state, action] = useActionState(
    updateTeamWhatsAppReminderSettings,
    initialState,
  );

  return (
    <section className="app-surface p-5 sm:p-7" aria-labelledby="reminder-settings-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div>
          <p className="app-kicker">WhatsApp</p>
          <h2 id="reminder-settings-title" className="mt-1 text-xl font-black tracking-tight text-graphite">
            Lembretes de confirmação
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Todo evento novo copia estes horários. Eventos existentes mantêm o
            que já foi definido.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <div className="grid gap-4 sm:grid-cols-2">
          <HourField
            id="team-first-reminder-hours"
            name="firstHours"
            label="Primeiro lembrete"
            help="Horas antes do evento"
            defaultValue={firstHours}
          />
          <HourField
            id="team-second-reminder-hours"
            name="secondHours"
            label="Última chamada"
            help="Depois do primeiro e antes do fechamento"
            defaultValue={secondHours}
          />
        </div>
        {state.message ? (
          <p
            role={state.outcome === "error" ? "alert" : "status"}
            className={`rounded-xl p-3 text-sm font-semibold ${
              state.outcome === "error"
                ? "bg-red-50 text-red-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {state.message}
          </p>
        ) : null}
        <AsyncSubmitButton pendingLabel="Salvando horários..." className="w-full sm:w-auto">
          <BellRing aria-hidden /> Salvar lembretes
        </AsyncSubmitButton>
      </form>
    </section>
  );
}

function HourField({
  id,
  name,
  label,
  help,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  help: string;
  defaultValue: number;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-bold text-slate-800">
      {label}
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={25}
        max={720}
        step={1}
        required
        defaultValue={defaultValue}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      />
      <span className="mt-1 block text-xs font-normal text-slate-500">{help}</span>
    </label>
  );
}
