"use client";

import {
  respondToPublicEventFromAccess,
  type EventRsvpActionState,
} from "@/app/e/[publicId]/actions";
import {
  attendanceStatusLabels,
  type EventResponseStatus,
} from "@/lib/features/event-access/contract";
import {
  Check,
  CircleHelp,
  LoaderCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

type AttendanceStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "maybe"
  | "waitlist";

const responseOptions = [
  {
    status: "confirmed",
    label: "SIM",
    Icon: Check,
    active:
      "data-[active=true]:border-emerald-600 data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  },
  {
    status: "declined",
    label: "NÃO",
    Icon: X,
    active:
      "data-[active=true]:border-red-600 data-[active=true]:bg-red-600 data-[active=true]:text-white",
  },
  {
    status: "maybe",
    label: "TALVEZ",
    Icon: CircleHelp,
    active:
      "data-[active=true]:border-amber-500 data-[active=true]:bg-amber-400 data-[active=true]:text-amber-950",
  },
] as const satisfies ReadonlyArray<{
  status: EventResponseStatus;
  label: string;
  Icon: typeof Check;
  active: string;
}>;

export function EventAccessAttendance({
  publicId,
  currentStatus,
  canRespond,
}: {
  publicId: string;
  currentStatus: AttendanceStatus;
  canRespond: boolean;
}) {
  const initialState: EventRsvpActionState = {};
  const [state, action, pending] = useActionState(
    respondToPublicEventFromAccess,
    initialState,
  );
  const selectedStatus = state.status ?? currentStatus;
  const responseEnabled = canRespond && state.outcome !== "unavailable";

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-emerald-100">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Sua confirmação
      </p>
      <p
        className="mt-1 font-black text-slate-900"
        aria-live="polite"
      >
        {attendanceStatusLabels[selectedStatus]}
      </p>

      {responseEnabled ? (
        <form action={action} className="mt-4">
          <input type="hidden" name="publicId" value={publicId} />
          <div
            className="grid grid-cols-3 gap-2"
            aria-label="Responder presença"
          >
            {responseOptions.map(({ status, label, Icon, active }) => (
              <button
                key={status}
                type="submit"
                name="status"
                value={status}
                disabled={pending}
                aria-pressed={selectedStatus === status}
                data-active={selectedStatus === status}
                className={`flex min-h-14 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-1 text-xs font-black text-slate-700 transition hover:border-emerald-400 disabled:cursor-wait disabled:opacity-50 ${active}`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          {pending ? (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800"
            >
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Salvando sua resposta…
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          A alteração por este link não está disponível agora. Sua resposta
          atual continua visível.
        </p>
      )}

      {state.message ? (
        <p
          role={state.outcome === "error" ? "alert" : "status"}
          className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
            state.outcome === "success"
              ? "bg-emerald-50 text-emerald-800"
              : state.outcome === "error"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      {!responseEnabled ? (
        <Link
          href="/me/agenda"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-grass px-4 text-sm font-black text-white transition hover:bg-emerald-900"
        >
          Abrir minha agenda
        </Link>
      ) : null}
    </div>
  );
}
