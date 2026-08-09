"use client";

import {
  sendNextEventWhatsAppReminder,
  updateEventWhatsAppReminderSettings,
  type EventReminderActionState,
} from "@/app/app/[teamSlug]/events/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { BellRing, CheckCircle2, Clock3, Send, XCircle } from "lucide-react";
import { useActionState, useState } from "react";

type ReminderSlot = {
  slotId: string;
  slotKey: "reminder_1" | "reminder_2";
  status: "scheduled" | "processing" | "enqueued" | "skipped" | "cancelled";
  scheduledFor: string;
  triggeredManually: boolean;
  consumedAt: string | null;
  eligibleCount: number;
  outboxCount: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
};

const initialState: EventReminderActionState = {};

export function EventWhatsAppReminders({
  teamId,
  teamSlug,
  eventId,
  timezone,
  isOverride,
  firstHours,
  secondHours,
  slots,
}: {
  teamId: string;
  teamSlug: string;
  eventId: string;
  timezone: string;
  isOverride: boolean;
  firstHours: number;
  secondHours: number;
  slots: ReminderSlot[];
}) {
  const [settingsState, settingsAction] = useActionState(
    updateEventWhatsAppReminderSettings,
    initialState,
  );
  const [sendState, sendAction] = useActionState(
    sendNextEventWhatsAppReminder,
    initialState,
  );
  const [initialRequestId] = useState(() => crypto.randomUUID());
  const requestId = sendState.nextRequestId ?? initialRequestId;

  const nextSlot = slots.find((slot) => slot.status === "scheduled");
  const eligibleCount = nextSlot?.eligibleCount ?? 0;

  return (
    <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-labelledby="event-reminders-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">WhatsApp</p>
          <h2 id="event-reminders-title" className="mt-1 text-lg font-black text-emerald-950">
            Lembretes da chamada
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/80">
            Só pendentes com telefone e consentimento válidos entram no envio.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {slots.map((slot) => (
          <article key={slot.slotId} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-900">
                {slot.slotKey === "reminder_1" ? "Primeiro lembrete" : "Última chamada"}
              </p>
              <SlotStatus status={slot.status} />
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <Clock3 className="size-4" aria-hidden />
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: timezone,
              }).format(new Date(slot.scheduledFor))}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {slot.outboxCount
                ? `${slot.outboxCount} preparados · ${slot.sentCount} enviados · ${slot.failedCount} falhas`
                : "Nenhuma mensagem preparada"}
            </p>
          </article>
        ))}
      </div>

      <form action={sendAction} className="mt-4 rounded-2xl bg-white p-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="requestId" value={requestId} />
        <p className="font-black text-slate-900">
          {nextSlot
            ? `${eligibleCount} ${eligibleCount === 1 ? "pessoa pendente" : "pessoas pendentes"}`
            : "As duas cotas já foram encerradas"}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          A quantidade será recalculada dentro da transação antes de preparar as mensagens.
        </p>
        {sendState.message ? <ActionMessage state={sendState} /> : null}
        <AsyncSubmitButton
          pendingLabel="Preparando lembrete..."
          disabled={!nextSlot || eligibleCount === 0}
          className="mt-3 w-full"
        >
          <Send aria-hidden /> Enviar lembrete agora
        </AsyncSubmitButton>
      </form>

      <details className="mt-4 rounded-2xl bg-white p-4">
        <summary className="cursor-pointer text-sm font-black text-slate-900">
          Horários deste evento
        </summary>
        <form action={settingsAction} className="mt-4 space-y-4">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="mode" value="custom" />
          <div className="grid gap-3 sm:grid-cols-2">
            <EventHourField name="firstHours" label="Primeiro" defaultValue={firstHours} />
            <EventHourField name="secondHours" label="Última chamada" defaultValue={secondHours} />
          </div>
          {settingsState.message ? <ActionMessage state={settingsState} /> : null}
          <AsyncSubmitButton pendingLabel="Salvando..." variant="outline" className="w-full">
            Salvar horários personalizados
          </AsyncSubmitButton>
        </form>
        {isOverride ? (
          <form action={settingsAction} className="mt-2">
            <input type="hidden" name="teamId" value={teamId} />
            <input type="hidden" name="teamSlug" value={teamSlug} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="mode" value="inherit" />
            <AsyncSubmitButton pendingLabel="Restaurando padrão..." variant="ghost" className="w-full">
              Usar padrão do time
            </AsyncSubmitButton>
          </form>
        ) : (
          <p className="mt-3 text-center text-xs font-semibold text-emerald-700">Usando o padrão do time</p>
        )}
      </details>
    </section>
  );
}

function ActionMessage({ state }: { state: EventReminderActionState }) {
  return (
    <p
      role={state.outcome === "error" ? "alert" : "status"}
      className={`mt-3 rounded-xl p-3 text-sm font-semibold ${
        state.outcome === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
      }`}
    >
      {state.message}
    </p>
  );
}

function EventHourField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="text-sm font-bold text-slate-800">
      {label}
      <input
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={720}
        step={1}
        required
        defaultValue={defaultValue}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-base font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      />
      <span className="mt-1 block text-xs font-normal text-slate-500">horas antes</span>
    </label>
  );
}

function SlotStatus({ status }: { status: ReminderSlot["status"] }) {
  const closed = status === "enqueued" || status === "skipped" || status === "cancelled";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${closed ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}>
      {closed ? <XCircle className="size-3" aria-hidden /> : <CheckCircle2 className="size-3" aria-hidden />}
      {{
        scheduled: "Agendado",
        processing: "Processando",
        enqueued: "Preparado",
        skipped: "Ignorado",
        cancelled: "Cancelado",
      }[status]}
    </span>
  );
}
