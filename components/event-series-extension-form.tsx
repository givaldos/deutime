"use client";

import {
  extendEventSeries,
  type EventSeriesExtensionState,
} from "@/app/app/[teamSlug]/events/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { CalendarPlus } from "lucide-react";
import { useActionState } from "react";

const initialState: EventSeriesExtensionState = {};

export function EventSeriesExtensionForm({
  teamId,
  teamSlug,
  eventId,
  seriesId,
  currentOccurrences,
  maxAdditionalOccurrences,
  initialRequestId,
}: {
  teamId: string;
  teamSlug: string;
  eventId: string;
  seriesId: string;
  currentOccurrences: number;
  maxAdditionalOccurrences: number;
  initialRequestId: string;
}) {
  const [state, formAction] = useActionState(
    extendEventSeries,
    initialState,
  );

  return (
    <section
      aria-labelledby="extend-series-title"
      className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-sky-700">
          <CalendarPlus className="size-5" aria-hidden />
        </div>
        <div>
          <h2 id="extend-series-title" className="font-black text-sky-950">
            Adicionar datas à série
          </h2>
          <p className="mt-1 text-sm leading-6 text-sky-900/80">
            Novas ocorrências serão criadas depois da última data, no mesmo
            dia da semana, horário e fuso do time.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="seriesId" value={seriesId} />
        <input type="hidden" name="requestId" value={initialRequestId} />

        <div>
          <label
            htmlFor="additional-occurrences"
            className="text-sm font-bold text-sky-950"
          >
            Quantas novas datas?
          </label>
          <input
            id="additional-occurrences"
            name="additionalOccurrences"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxAdditionalOccurrences}
            defaultValue={1}
            required
            aria-describedby="additional-occurrences-help"
            className="mt-2 min-h-12 w-full rounded-xl border border-sky-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
          />
          <p
            id="additional-occurrences-help"
            className="mt-2 text-xs leading-5 text-sky-900/70"
          >
            A série possui {currentOccurrences} ocorrências. Você pode adicionar
            até {maxAdditionalOccurrences}, respeitando o limite total de 52.
            A chamada nasce pendente para o elenco ativo.
          </p>
        </div>

        {state.message ? (
          <p role="alert" className="text-sm font-semibold text-red-800">
            {state.message}
          </p>
        ) : null}

        <AsyncSubmitButton
          pendingLabel="Adicionando novas datas..."
          size="lg"
          className="w-full bg-sky-700 hover:bg-sky-800"
        >
          <CalendarPlus aria-hidden />
          Adicionar à série
        </AsyncSubmitButton>
      </form>
    </section>
  );
}
