"use client";

import { Button } from "@/components/ui/button";
import { Check, Link2, Share2 } from "lucide-react";
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

export function PublicEventLinkCard({
  publicUrl,
  eventTitle,
}: {
  publicUrl: string;
  eventTitle: string;
}) {
  const [status, setStatus] = useState<
    "idle" | "shared" | "copied" | "error"
  >("idle");

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: eventTitle,
          text: `Confira ${eventTitle} no DeuTime.`,
          url: publicUrl,
        });
        setStatus("shared");
        return;
      }
      await copyText(publicUrl);
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
    <section
      aria-labelledby="public-event-link-title"
      className="app-surface p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Link2 className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="app-kicker">Compartilhar</p>
            <h2
              id="public-event-link-title"
              className="mt-1 text-lg font-black tracking-tight"
            >
              Compartilhe com a galera
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Envie o evento pelo WhatsApp ou por outro aplicativo.
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="h-12 w-full sm:w-auto"
          onClick={handleShare}
        >
          {status === "shared" || status === "copied" ? (
            <Check aria-hidden />
          ) : (
            <Share2 aria-hidden />
          )}
          {status === "shared"
            ? "Compartilhado"
            : status === "copied"
              ? "Link copiado"
              : "Compartilhar evento"}
        </Button>
      </div>

      {status !== "idle" ? (
        <p
          className={`mt-2 text-center text-xs font-medium sm:text-right ${
            status === "error" ? "text-red-700" : "text-emerald-700"
          }`}
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {status === "shared"
            ? "Evento enviado."
            : status === "copied"
              ? "Link copiado. Agora é só colar no WhatsApp."
              : "Não foi possível compartilhar. Tente novamente."}
        </p>
      ) : null}
    </section>
  );
}
