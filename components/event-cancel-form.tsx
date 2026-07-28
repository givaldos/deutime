"use client";

import {
  cancelEvent,
  type EventCancellationState,
} from "@/app/app/[teamSlug]/events/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { AlertTriangle, Ban } from "lucide-react";
import { useActionState } from "react";

const initialState: EventCancellationState = {};

export function EventCancelForm({
  teamId,
  teamSlug,
  eventId,
  hasSeries,
  initialRequestId,
}: {
  teamId: string;
  teamSlug: string;
  eventId: string;
  hasSeries: boolean;
  initialRequestId: string;
}) {
  const [state, formAction] = useActionState(cancelEvent, initialState);

  return (
    <section
      aria-labelledby="cancel-event-title"
      className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-red-700">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <div>
          <h2 id="cancel-event-title" className="font-black text-red-950">
            Cancelar evento
          </h2>
          <p className="mt-1 text-sm leading-6 text-red-900/80">
            O evento não será apagado. Presenças, times montados e súmula
            continuarão disponíveis no histórico.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="requestId" value={initialRequestId} />

        {hasSeries ? (
          <fieldset>
            <legend className="text-sm font-bold text-red-950">
              Alcance do cancelamento
            </legend>
            <div className="mt-2 grid gap-2">
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-red-200 bg-white p-3">
                <input
                  className="mt-1 size-4 accent-red-700"
                  type="radio"
                  name="cancelScope"
                  value="single_event"
                  defaultChecked
                />
                <span>
                  <span className="block text-sm font-bold text-red-950">
                    Somente esta ocorrência
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-red-900/70">
                    As outras datas da série continuam agendadas.
                  </span>
                </span>
              </label>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-red-200 bg-white p-3">
                <input
                  className="mt-1 size-4 accent-red-700"
                  type="radio"
                  name="cancelScope"
                  value="this_and_future"
                />
                <span>
                  <span className="block text-sm font-bold text-red-950">
                    Esta e todas as próximas
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-red-900/70">
                    Cancela as ocorrências futuras e encerra a série.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        ) : (
          <input type="hidden" name="cancelScope" value="single_event" />
        )}

        <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-white p-3 text-sm leading-5 text-red-950">
          <input
            className="mt-0.5 size-4 accent-red-700"
            type="checkbox"
            name="confirmation"
            value="confirmed"
            required
          />
          <span>
            Entendo que o evento ficará cancelado e não poderá ser editado ou
            reaberto por este fluxo.
          </span>
        </label>

        {state.message ? (
          <p role="alert" className="text-sm font-semibold text-red-800">
            {state.message}
          </p>
        ) : null}

        <AsyncSubmitButton
          pendingLabel="Cancelando evento..."
          variant="destructive"
          size="lg"
          className="w-full"
        >
          <Ban aria-hidden />
          Confirmar cancelamento
        </AsyncSubmitButton>
      </form>
    </section>
  );
}
