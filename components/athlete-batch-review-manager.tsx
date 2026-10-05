"use client";

import {
  applyAthleteBatchReview,
  previewAthleteBatchReview,
  type AthleteBatchActionState,
} from "@/app/app/[teamSlug]/athletes/actions";
import { ManagementAthleteList } from "@/components/management-athlete-list";
import { Button } from "@/components/ui/button";
import { useBatchDialogFocus } from "@/components/use-batch-dialog-focus";
import { useBatchRecovery } from "@/components/use-batch-recovery";
import type { ManagementAthleteItem } from "@/lib/data/management-athletes";
import type { BatchPreviewEnvelope } from "@/lib/validation/batch-operations";
import { Check, LoaderCircle, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

function ReviewDialog({ state, applying, onApply, onClose }: {
  state: AthleteBatchActionState;
  applying: boolean;
  onApply: (preview: BatchPreviewEnvelope) => void;
  onClose: () => void;
}) {
  const preview = state.preview;
  const dialogRef = useBatchDialogFocus(onClose);
  return <div className="fixed inset-0 z-[60] flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-6">
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="athlete-batch-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="app-kicker">Antes de salvar</p><h2 id="athlete-batch-title" className="mt-1 text-xl font-black">Conferir análise</h2></div><Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar prévia"><X aria-hidden /></Button></div>
      <p role="status" className={`mt-4 rounded-2xl p-3 text-sm font-bold ${state.outcome === "error" || preview?.blocked_count ? "bg-red-50 text-red-800" : state.outcome === "success" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{state.message}</p>
      {preview ? <>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1.5">{preview.item_count} {preview.item_count === 1 ? "cadastro" : "cadastros"}</span><span className="rounded-full bg-slate-100 px-3 py-1.5">{preview.blocked_count} impedido{preview.blocked_count === 1 ? "" : "s"}</span><span className="rounded-full bg-slate-100 px-3 py-1.5">Nenhuma mensagem será enviada</span></div>
        <div className="mt-4 space-y-2">{preview.items.map((item, index) => <article key={String(item.id ?? index)} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${item.eligible === true ? "border-slate-200" : "border-red-200 bg-red-50"}`}><div><h3 className="font-black">{String(item.name ?? "Atleta")}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{preview.action === "approve" ? "Aprovar vínculo" : "Rejeitar vínculo"}</p></div><span className={`text-xs font-black ${item.eligible === true ? "text-emerald-700" : "text-red-700"}`}>{item.eligible === true ? "Pronto" : "Impedido"}</span></article>)}</div>
      </> : null}
      <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" onClick={onClose}>Voltar sem salvar</Button>{preview && state.outcome !== "success" ? <Button type="button" disabled={applying || preview.blocked_count > 0} onClick={() => onApply(preview)}>{applying ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}{preview.action === "approve" ? "Aprovar" : "Rejeitar"} {preview.item_count}</Button> : null}</div>
    </section>
  </div>;
}

export function AthleteBatchReviewManager({ athletes, teamId, teamSlug, returnUrl }: {
  athletes: ManagementAthleteItem[];
  teamId: string;
  teamSlug: string;
  returnUrl: string;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [state, setState] = useState<AthleteBatchActionState>({ outcome: "idle" });
  const [previewing, startPreview] = useTransition();
  const [applying, startApply] = useTransition();
  const requestId = useRef<string | null>(null);
  const applyingRef = useRef(false);
  const recovery = useBatchRecovery(teamId, "athletes");
  const selectedSet = useMemo(() => new Set(selected), [selected]);


  function closePreview() {
    if (applying) return;
    setState({ outcome: "idle" });
    requestId.current = null;
  }
  function preview() {
    if (recovery.pending) return;
    startPreview(async () => {
      try {
        const result = await previewAthleteBatchReview({ teamId, selection: { mode: "explicit", ids: selected }, decision });
        requestId.current = result.outcome === "preview" ? crypto.randomUUID() : null;
        setState(result);
      } catch {
        setState({ outcome: "error", message: "A conexão falhou antes da prévia. Tente novamente." });
      }
    });
  }
  function apply(previewEnvelope: BatchPreviewEnvelope, retryId?: string) {
    if (applyingRef.current) return;
    applyingRef.current = true;
    if (!requestId.current) requestId.current = retryId ?? crypto.randomUUID();
    const stableRequestId = requestId.current;
    recovery.remember(stableRequestId, previewEnvelope);
    startApply(async () => {
      try {
        const result = await applyAthleteBatchReview({ teamId, teamSlug, requestId: stableRequestId, preview: previewEnvelope });
        setState((current) => ({ ...result, preview: current.preview }));
        if (result.outcome === "success") {
          recovery.complete();
          setSelected([]);
          setSelecting(false);
          router.refresh();
        } else {
          recovery.complete();
        }
      } catch {
        setState((current) => ({ ...current, outcome: "error", message: "A conexão falhou. Tente confirmar novamente; o mesmo pedido será reutilizado." }));
        void recovery.check({ requestId: stableRequestId, preview: previewEnvelope }).then((status) => {
          if (status === "applied") {
            setState({ outcome: "idle" });
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

  const recoveryNotice = recovery.pending ? <div role="status" className="app-surface mb-4 space-y-2 p-4 text-sm">
    <p className="font-bold">Há uma confirmação sem resposta.</p>
    <p>{recovery.lookupState === "checking" ? "Consultando o resultado..." : recovery.lookupState === "unknown" ? "Ainda não há resultado registrado para este pedido." : "Não foi possível consultar o resultado. Tente novamente quando a conexão voltar."}</p>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={recovery.lookupState === "checking"} onClick={() => void recovery.check(recovery.pending!)}>Consultar resultado</Button>
      {!recovery.expired ? <Button type="button" disabled={applying} onClick={() => apply(recovery.pending!.preview, recovery.pending!.requestId)}>Repetir o mesmo pedido</Button> : recovery.lookupState === "unknown" ? <Button type="button" variant="outline" onClick={recovery.dismissExpired}>Fazer nova prévia</Button> : null}</div>
  </div> : recovery.appliedCount !== null && recovery.lookupState === "applied" ? <p role="status" className="app-surface mb-4 p-4 text-sm font-bold">Pedido recuperado: {recovery.appliedCount} {recovery.appliedCount === 1 ? "cadastro analisado" : "cadastros analisados"}. Nenhuma mensagem foi enviada.</p> : null;

  if (!selecting) return <>{recoveryNotice}<div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-600">Abra um cadastro ou analise vários de uma vez.</p><Button type="button" variant="outline" disabled={!!recovery.pending} onClick={() => setSelecting(true)}>Selecionar</Button></div><ManagementAthleteList athletes={athletes} teamSlug={teamSlug} returnUrl={returnUrl} /></>;
  return <>
    {recoveryNotice}
    <div className="app-surface mb-4 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</p><button type="button" className="min-h-11 px-2 text-xs font-bold text-emerald-800" onClick={() => setSelected(selected.length === athletes.length ? [] : athletes.map((athlete) => athlete.id))}>{selected.length === athletes.length ? "Limpar seleção" : "Selecionar esta página"}</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-bold text-slate-600">Decisão</span><select className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={decision} onChange={(event) => setDecision(event.target.value as "approve" | "reject")}><option value="approve">Aprovar vínculos</option><option value="reject">Rejeitar vínculos</option></select></label><Button type="button" variant="outline" className="self-end" onClick={() => { setSelecting(false); setSelected([]); closePreview(); }}>Cancelar seleção</Button></div></div>
    <div className="grid gap-3 sm:grid-cols-2">{athletes.map((athlete) => { const chosen = selectedSet.has(athlete.id); return <label key={athlete.id} className={`app-surface app-interactive flex min-h-20 cursor-pointer items-center gap-3 p-4 focus-within:ring-2 focus-within:ring-emerald-700 ${chosen ? "border-emerald-600 ring-2 ring-emerald-600/20" : ""}`}><input type="checkbox" className="sr-only" checked={chosen} onChange={() => { if (recovery.pending) return; setSelected((current) => current.includes(athlete.id) ? current.filter((id) => id !== athlete.id) : [...current, athlete.id]); closePreview(); }} /><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${chosen ? "bg-grass text-white" : "bg-amber-50 text-amber-800"}`}>{chosen ? <Check aria-hidden /> : <UserRound aria-hidden />}</span><span className="min-w-0"><span className="block truncate font-black">{athlete.display_name}</span><span className="text-xs font-semibold text-slate-500">BID #{athlete.registration_number}</span></span></label>; })}</div>
    {selected.length ? <div className="fixed inset-x-0 bottom-20 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 sm:rounded-2xl sm:border"><Button type="button" className="w-full" disabled={previewing || !!recovery.pending} onClick={preview}>{previewing ? <LoaderCircle className="animate-spin" aria-hidden /> : null}Conferir decisão em {selected.length}</Button></div> : null}
    {state.outcome !== "idle" ? <ReviewDialog state={state} applying={applying} onApply={apply} onClose={closePreview} /> : null}
  </>;
}
