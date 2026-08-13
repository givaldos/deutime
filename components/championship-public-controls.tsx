"use client";

import {
  setChampionshipPublicMode,
  type ChampionshipActionState,
} from "@/app/app/[teamSlug]/championships/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, Link2, Share2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

const initialState: ChampionshipActionState = {};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Cópia indisponível");
}

export function buildChampionshipShareData(
  publicUrl: string,
  championshipName: string,
): ShareData {
  return {
    title: championshipName,
    text: `Acompanhe ${championshipName} no DeuTime.\n${publicUrl}`,
  };
}

export function ChampionshipShareButton({
  publicUrl,
  championshipName,
}: {
  publicUrl: string;
  championshipName: string;
}) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "error">("idle");

  async function share() {
    const data = buildChampionshipShareData(publicUrl, championshipName);
    try {
      if (navigator.share) {
        await navigator.share(data);
        setStatus("shared");
        return;
      }
      await copyText(data.text ?? publicUrl);
      setStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
    }
  }

  return (
    <div>
      <Button type="button" onClick={share} className="min-h-12 w-full sm:w-auto">
        {status === "shared" || status === "copied"
          ? <Check aria-hidden />
          : <Share2 aria-hidden />}
        {status === "shared"
          ? "Compartilhado"
          : status === "copied"
            ? "Mensagem copiada"
            : "Compartilhar campeonato"}
      </Button>
      {status !== "idle" ? (
        <p
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mt-2 text-xs font-bold ${status === "error" ? "text-red-700" : "text-emerald-700"}`}
        >
          {status === "shared"
            ? "Campeonato enviado."
            : status === "copied"
              ? "Mensagem copiada. Agora é só colar no WhatsApp."
              : "Não foi possível compartilhar. Tente novamente."}
        </p>
      ) : null}
    </div>
  );
}

export function ChampionshipPublicControls({
  teamId,
  teamSlug,
  championshipId,
  publicId,
  publicMode,
  publicUrl,
  championshipName,
}: {
  teamId: string;
  teamSlug: string;
  championshipId: string;
  publicId: string;
  publicMode: "private" | "public";
  publicUrl: string;
  championshipName: string;
}) {
  const [state, action, pending] = useActionState(setChampionshipPublicMode, initialState);
  const [requestId] = useState(() => crypto.randomUUID());
  const fields = (
    <>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="championshipId" value={championshipId} />
      <input type="hidden" name="publicId" value={publicId} />
      <input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
    </>
  );

  return (
    <section className="app-surface p-5 sm:p-7" aria-labelledby="public-page-title">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Link2 className="size-5" aria-hidden /></span>
        <div><p className="app-kicker">WhatsApp-first</p><h2 id="public-page-title" className="mt-1 text-xl font-black text-graphite">Página compartilhável</h2><p className="mt-1 text-sm text-slate-500">Mostra somente regulamento, equipes, tabela, chave e placares já autorizados.</p></div>
      </div>

      {publicMode === "private" ? (
        <form action={action} className="mt-5 space-y-3">
          {fields}<input type="hidden" name="mode" value="public" />
          <AsyncSubmitButton disabled={pending} pendingLabel="Publicando página..." className="min-h-14 w-full text-base">Publicar página</AsyncSubmitButton>
          <ActionMessage state={state} />
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-950">Página publicada</p>
            <p className="mt-1 text-xs leading-5 text-emerald-800">O link fica fora de buscadores e não envia endereço, atletas ou IDs internos.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <ChampionshipShareButton publicUrl={publicUrl} championshipName={championshipName} />
            <Button asChild variant="outline" className="min-h-12 w-full sm:w-auto"><Link href={`/c/${publicId}`} target="_blank" rel="noreferrer">Abrir página <ExternalLink aria-hidden /></Link></Button>
          </div>
          <details className="rounded-xl border border-dashed border-slate-200 px-3">
            <summary className="min-h-11 cursor-pointer list-none py-3 text-xs font-black text-slate-600">Recolher página pública</summary>
            <form action={action} className="space-y-3 border-t border-slate-100 py-3">
              {fields}<input type="hidden" name="mode" value="private" />
              <p className="text-xs text-slate-500">O link deixará de mostrar o campeonato. Partidas e histórico permanecem intactos.</p>
              <AsyncSubmitButton disabled={pending} pendingLabel="Recolhendo página..." variant="outline" className="min-h-12 w-full">Confirmar recolhimento</AsyncSubmitButton>
              <ActionMessage state={state} />
            </form>
          </details>
        </div>
      )}
    </section>
  );
}

function ActionMessage({ state }: { state: ChampionshipActionState }) {
  if (!state.message) return null;
  return <p role={state.outcome === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm font-bold ${state.outcome === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>;
}
