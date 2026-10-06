"use client";

import { Button } from "@/components/ui/button";
import { useBatchDialogFocus } from "@/components/use-batch-dialog-focus";
import { useBatchRecovery } from "@/components/use-batch-recovery";
import type { ManagementEventItem } from "@/lib/data/management-events";
import type { BatchPreviewEnvelope, EventBatchPreviewRequest } from "@/lib/validation/batch-operations";
import {
  applyEventBatchOperation,
  previewEventBatchOperation,
  type EventBatchActionState,
} from "@/app/app/[teamSlug]/events/actions";
import { CalendarClock, Check, Clock3, LoaderCircle, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

type BatchAction = "shift_time" | "set_local_time" | "set_venue" | "set_duration" | "postpone" | "date_tbd" | "cancel";

export function buildEventBatchOperation(
  action: BatchAction,
  rawValue: string,
): EventBatchPreviewRequest["operation"] | null {
  if (action === "postpone" || action === "date_tbd" || action === "cancel") return { action };
  if (action === "set_venue") {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawValue)
      ? { action, venueId: rawValue }
      : null;
  }
  if (action === "set_local_time") {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(rawValue)
      ? { action, localTime: rawValue }
      : null;
  }
  const value = Number(rawValue);
  if (!Number.isInteger(value)) return null;
  if (action === "shift_time") {
    return value !== 0 && Math.abs(value) <= 10_080
      ? { action, offsetMinutes: value }
      : null;
  }
  return value >= 15 && value <= 480
    ? { action, durationMinutes: value }
    : null;
}

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function eventHref(teamSlug: string, eventId: string, returnTo: string) {
  return `/app/${teamSlug}/events/${eventId}?${new URLSearchParams({ returnTo })}`;
}

function readPreviewValue(value: unknown, key: string) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function PreviewDialog({
  actionState,
  applying,
  onApply,
  onClose,
  returnFocusRef,
  timeZone,
  venues,
}: {
  actionState: EventBatchActionState;
  applying: boolean;
  onApply: (preview: BatchPreviewEnvelope) => void;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  timeZone: string;
  venues: Array<{ id: string; name: string }>;
}) {
  const preview = actionState.preview;
  const dialogRef = useBatchDialogFocus(onClose, returnFocusRef);
  return <div className="fixed inset-0 z-[60] flex items-end bg-slate-950/55 p-0 sm:items-center sm:justify-center sm:p-6">
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="batch-preview-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="app-kicker">Antes de salvar</p><h2 id="batch-preview-title" className="mt-1 text-xl font-black">Conferir alterações</h2></div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar prévia"><X aria-hidden /></Button>
      </div>
      <p className={`mt-4 rounded-2xl p-3 text-sm font-bold ${actionState.outcome === "error" || preview?.blocked_count ? "bg-red-50 text-red-800" : actionState.outcome === "success" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`} role="status">{actionState.message}</p>
      {preview ? <>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{preview.item_count} {preview.item_count === 1 ? "jogo" : "jogos"}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{preview.blocked_count} impedido{preview.blocked_count === 1 ? "" : "s"}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Nenhuma mensagem será enviada</span>
        </div>
        <div className="mt-4 space-y-3">
          {preview.items.map((item, index) => {
            const id = String(item.id ?? index);
            const beforeStarts = readPreviewValue(item.before, "starts_at");
            const afterStarts = readPreviewValue(item.after, "starts_at");
            const beforeEnds = readPreviewValue(item.before, "ends_at");
            const afterEnds = readPreviewValue(item.after, "ends_at");
            const afterState = readPreviewValue(item.after, "schedule_state");
            const afterStatus = readPreviewValue(item.after, "status");
            const beforeVenue = readPreviewValue(item.before, "venue_name");
            const afterVenueId = readPreviewValue(item.after, "venue_id");
            const afterVenue = venues.find((venue) => venue.id === afterVenueId)?.name;
            const eligible = item.eligible === true;
            return <article key={id} className={`rounded-2xl border p-4 ${eligible ? "border-slate-200" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-start justify-between gap-3"><h3 className="font-black">{String(item.title ?? "Jogo")}</h3><span className={`text-xs font-black ${eligible ? "text-emerald-700" : "text-red-700"}`}>{eligible ? "Pronto" : "Impedido"}</span></div>
              {eligible ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">Antes</p><p className="mt-1 font-semibold">{preview.action === "set_venue" ? typeof beforeVenue === "string" ? beforeVenue : "Sem local" : typeof beforeStarts === "string" ? formatDate(beforeStarts, timeZone) : "Sem horário"}</p>{preview.action !== "set_venue" && typeof beforeEnds === "string" ? <p className="text-xs text-slate-500">até {formatDate(beforeEnds, timeZone)}</p> : null}</div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700">Depois</p><p className="mt-1 font-semibold">{preview.action === "set_venue" ? afterVenue ?? "Local selecionado" : afterStatus === "cancelled" ? "Cancelado" : afterState === "postponed" ? "Adiado" : afterState === "date_tbd" ? "Data a definir" : typeof afterStarts === "string" ? formatDate(afterStarts, timeZone) : "Sem horário"}</p>{preview.action !== "set_venue" && typeof afterEnds === "string" && afterStatus !== "cancelled" && !["postponed", "date_tbd"].includes(String(afterState)) ? <p className="text-xs text-emerald-700">até {formatDate(afterEnds, timeZone)}</p> : null}</div>
              </div> : <p className="mt-2 text-sm text-red-700">Este jogo mudou ou possui um impedimento. Remova-o da seleção.</p>}
            </article>;
          })}
        </div>
      </> : null}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onClose}>Voltar sem salvar</Button>
        {preview && actionState.outcome !== "success" ? <Button type="button" disabled={applying || preview.blocked_count > 0} onClick={() => onApply(preview)}>{applying ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}Atualizar {preview.item_count} {preview.item_count === 1 ? "jogo" : "jogos"}</Button> : null}
      </div>
    </section>
  </div>;
}

export function EventBatchManager({
  events,
  returnTo,
  teamId,
  teamSlug,
  timeZone,
  venues,
}: {
  events: ManagementEventItem[];
  returnTo: string;
  teamId: string;
  teamSlug: string;
  timeZone: string;
  venues: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<BatchAction>("shift_time");
  const [rawValue, setRawValue] = useState("60");
  const [scope, setScope] = useState<"selected" | "this_and_future">("selected");
  const [actionState, setActionState] = useState<EventBatchActionState>({ outcome: "idle" });
  const [previewing, startPreview] = useTransition();
  const [applying, startApply] = useTransition();
  const requestId = useRef<string | null>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const applyingRef = useRef(false);
  const recovery = useBatchRecovery(teamId, "events");
  const selectedSet = useMemo(() => new Set(selected), [selected]);


  function closePreview() {
    if (applying) return;
    setActionState({ outcome: "idle" });
    requestId.current = null;
  }

  function toggleSelection(eventId: string) {
    if (recovery.pending) return;
    setSelected((current) => current.includes(eventId)
      ? current.filter((id) => id !== eventId)
      : [...current, eventId]);
    setScope("selected");
    setActionState({ outcome: "idle" });
    requestId.current = null;
  }

  function handlePreview() {
    if (recovery.pending) return;
    const operation = buildEventBatchOperation(action, rawValue);
    if (!operation) {
      setActionState({ outcome: "error", message: "Informe uma alteração válida antes de conferir." });
      return;
    }
    startPreview(async () => {
      try {
        const result = await previewEventBatchOperation({
          teamId,
          selection: { mode: "explicit", ids: selected },
          scope,
          operation,
        });
        requestId.current = result.outcome === "preview" ? crypto.randomUUID() : null;
        setActionState(result);
      } catch {
        setActionState({ outcome: "error", message: "A conexão falhou antes da prévia. Tente novamente." });
      }
    });
  }

  function handleApply(preview: BatchPreviewEnvelope, retryId?: string) {
    if (applyingRef.current) return;
    applyingRef.current = true;
    if (!requestId.current) requestId.current = retryId ?? crypto.randomUUID();
    const stableRequestId = requestId.current;
    recovery.remember(stableRequestId, preview);
    startApply(async () => {
      try {
        const result = await applyEventBatchOperation({ teamId, teamSlug, requestId: stableRequestId, preview });
        setActionState((current) => ({ ...result, preview: current.preview }));
        if (result.outcome === "success") {
          recovery.complete();
          setSelected([]);
          setSelecting(false);
          router.refresh();
        } else {
          recovery.complete();
        }
      } catch {
        setActionState((current) => ({ ...current, outcome: "error", message: "A conexão falhou. Tente confirmar novamente; o mesmo pedido será reutilizado." }));
        void recovery.check({ requestId: stableRequestId, preview }).then((status) => {
          if (status === "applied") {
            setActionState({ outcome: "idle" });
            setSelected([]);
            setSelecting(false);
            router.refresh();
          }
        });
      } finally {
        applyingRef.current = false;
      }
    });
  }

  return <>
    {recovery.pending ? <div role="status" className="app-surface mb-4 space-y-2 p-4 text-sm">
      <p className="font-bold">Há uma confirmação sem resposta.</p>
      <p>{recovery.lookupState === "checking" ? "Consultando o resultado..." : recovery.lookupState === "unknown" ? "Ainda não há resultado registrado para este pedido." : "Não foi possível consultar o resultado. Tente novamente quando a conexão voltar."}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={recovery.lookupState === "checking"} onClick={() => void recovery.check(recovery.pending!)}>Consultar resultado</Button>
        {!recovery.expired ? <Button type="button" disabled={applying} onClick={() => handleApply(recovery.pending!.preview, recovery.pending!.requestId)}>Repetir o mesmo pedido</Button> : recovery.lookupState === "unknown" ? <Button type="button" variant="outline" onClick={recovery.dismissExpired}>Fazer nova prévia</Button> : null}
      </div>
    </div> : recovery.appliedCount !== null && recovery.lookupState === "applied" ? <p role="status" className="app-surface mb-4 p-4 text-sm font-bold">Pedido recuperado: {recovery.appliedCount} {recovery.appliedCount === 1 ? "jogo alterado" : "jogos alterados"}. Nenhuma mensagem foi enviada.</p> : null}
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-slate-600">{selecting ? "Marque os jogos que receberão a mesma alteração." : "Abra um jogo ou altere vários de uma vez."}</p>
      <Button type="button" variant="outline" disabled={!!recovery.pending} onClick={() => { setSelecting((value) => !value); setSelected([]); closePreview(); }}>{selecting ? "Cancelar seleção" : "Selecionar"}</Button>
    </div>
    {selecting ? <div className="app-surface mb-4 p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-black">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</p><button type="button" className="min-h-11 px-2 text-xs font-bold text-emerald-800" onClick={() => { setSelected(selected.length === events.length ? [] : events.map((event) => event.id)); setScope("selected"); closePreview(); }}>{selected.length === events.length ? "Limpar seleção" : "Selecionar esta página"}</button></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label><span className="text-xs font-bold text-slate-600">Alteração</span><select className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={action} onChange={(event) => { const next = event.target.value as BatchAction; setAction(next); setScope("selected"); setRawValue(next === "set_local_time" ? "20:00" : next === "set_duration" ? "90" : next === "set_venue" ? venues[0]?.id ?? "" : "60"); }}><option value="shift_time">Adiantar ou atrasar</option><option value="set_local_time">Definir o mesmo horário</option><option value="set_venue">Definir local</option><option value="set_duration">Definir duração</option><option value="postpone">Adiar</option><option value="date_tbd">Deixar data a definir</option><option value="cancel">Cancelar eventos avulsos</option></select></label>
        {action === "set_venue" ? <label><span className="text-xs font-bold text-slate-600">Local</span><select className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={rawValue} onChange={(event) => setRawValue(event.target.value)}><option value="">Escolha um local</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label> : ["postpone", "date_tbd", "cancel"].includes(action) ? <div /> : <label><span className="text-xs font-bold text-slate-600">{action === "shift_time" ? "Minutos (+ atrasa, − adianta)" : action === "set_local_time" ? "Horário" : "Duração em minutos"}</span><input className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" type={action === "set_local_time" ? "time" : "number"} min={action === "set_duration" ? 15 : undefined} max={action === "set_duration" ? 480 : undefined} value={rawValue} onChange={(event) => setRawValue(event.target.value)} /></label>}
        <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Alcance</span><select className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={scope} onChange={(event) => setScope(event.target.value as "selected" | "this_and_future")}><option value="selected">Só os selecionados</option>{selected.length === 1 && action !== "cancel" ? <option value="this_and_future">Este e os próximos da série</option> : null}</select></label>
      </div>
    </div> : null}
    <div className="grid gap-3 lg:grid-cols-2">
      {events.map((event) => {
        const chosen = selectedSet.has(event.id);
        const content = <div className="flex items-start gap-3"><div className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl ${chosen ? "bg-grass text-white" : "bg-emerald-50 text-emerald-800"}`}>{selecting ? chosen ? <Check aria-hidden /> : <span className="size-5 rounded border-2 border-current" /> : <CalendarClock aria-hidden />}</div><div className="min-w-0 flex-1"><p className="truncate font-black">{event.title}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500"><span className="flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden />{formatDate(event.starts_at, timeZone)}</span>{event.venue_name ? <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{event.venue_name}</span> : null}</div></div></div>;
        return selecting ? <label key={event.id} className={`app-surface app-interactive block min-h-20 cursor-pointer p-4 focus-within:ring-2 focus-within:ring-emerald-700 ${chosen ? "border-emerald-600 ring-2 ring-emerald-600/20" : ""}`}><input type="checkbox" className="sr-only" aria-label={`Selecionar ${event.title}, ${formatDate(event.starts_at, timeZone)}`} checked={chosen} onChange={() => toggleSelection(event.id)} />{content}</label> : <Link key={event.id} href={eventHref(teamSlug, event.id, returnTo)} className="app-surface app-interactive block min-h-20 p-4">{content}</Link>;
      })}
    </div>
    {selecting && selected.length ? <div className="fixed inset-x-0 bottom-20 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 sm:rounded-2xl sm:border"><Button ref={previewButtonRef} type="button" className="w-full" disabled={previewing || !!recovery.pending} onClick={handlePreview}>{previewing ? <LoaderCircle className="animate-spin" aria-hidden /> : null}Conferir alterações em {selected.length}</Button></div> : null}
    {actionState.outcome !== "idle" ? <PreviewDialog actionState={actionState} applying={applying} onApply={handleApply} onClose={closePreview} returnFocusRef={previewButtonRef} timeZone={timeZone} venues={venues} /> : null}
  </>;
}
