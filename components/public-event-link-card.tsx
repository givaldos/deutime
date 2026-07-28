"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

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

  if (!copied) {
    throw new Error("O navegador não permitiu copiar o endereço.");
  }
}

export function PublicEventLinkCard({ publicUrl }: { publicUrl: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await copyText(publicUrl);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      aria-labelledby="public-event-link-title"
      className="app-surface p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Link2 className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="app-kicker">Compartilhar</p>
          <h2
            id="public-event-link-title"
            className="mt-1 text-lg font-black tracking-tight"
          >
            Link público do evento
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Qualquer pessoa com este endereço poderá consultar as informações
            públicas do evento.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="truncate text-xs font-medium text-slate-600" title={publicUrl}>
          {publicUrl}
        </p>
      </div>

      <Button type="button" className="mt-3 h-12 w-full" onClick={handleCopy}>
        {status === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
        {status === "copied" ? "Link copiado" : "Copiar link público"}
      </Button>

      <p
        className={`mt-2 min-h-5 text-center text-xs font-medium ${
          status === "error" ? "text-red-700" : "text-emerald-700"
        }`}
        role={status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {status === "copied"
          ? "Pronto para colar no WhatsApp."
          : status === "error"
            ? "Não foi possível copiar. Toque e segure o endereço acima."
            : ""}
      </p>
    </section>
  );
}
