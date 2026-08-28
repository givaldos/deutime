"use client";

import {
  updateRegistrationEmailPreference,
  type RegistrationEmailPreferenceState,
} from "@/app/app/[teamSlug]/settings/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { MailCheck } from "lucide-react";
import { useActionState } from "react";

export function RegistrationEmailPreferenceForm({
  teamId,
  teamSlug,
  enabled,
}: {
  teamId: string;
  teamSlug: string;
  enabled: boolean;
}) {
  const [state, action] = useActionState<
    RegistrationEmailPreferenceState,
    FormData
  >(updateRegistrationEmailPreference, {});

  return (
    <section className="app-surface p-5 sm:p-7" aria-labelledby="registration-email-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <div>
          <p className="app-kicker">Avisos por e-mail</p>
          <h2 id="registration-email-title" className="mt-1 text-xl font-black tracking-tight text-graphite">
            Novos pedidos de entrada
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Receba um aviso sem dados pessoais quando alguém entrar na fila. A revisão continua somente na área protegida.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={enabled}
            className="size-5 rounded border-slate-300 accent-emerald-700"
          />
          Avisar neste e-mail quando chegar um pedido
        </label>
        <p className="text-xs leading-5 text-slate-500">
          Esta escolha vale apenas para você e para este time. Alertas obrigatórios de segurança não são alterados.
        </p>
        {state.message ? (
          <p role={state.outcome === "error" ? "alert" : "status"} className="text-sm font-medium text-slate-700">
            {state.message}
          </p>
        ) : null}
        <AsyncSubmitButton pendingLabel="Salvando..." className="min-h-11 w-full sm:w-auto">
          Salvar preferência
        </AsyncSubmitButton>
      </form>
    </section>
  );
}
