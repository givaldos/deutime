"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";

export function EventLineupShareActions({
  eventTitle,
  eventUrl,
  imageUrl,
}: {
  eventTitle: string;
  eventUrl: string;
  imageUrl: string;
}) {
  const [message, setMessage] = useState<string>();

  async function shareImage() {
    try {
      const absoluteEventUrl = new URL(eventUrl, window.location.origin).toString();
      if (!navigator.share) {
        setMessage("Baixe a imagem ou copie o link.");
        return;
      }
      const response = await fetch(imageUrl);
      const blob = response.ok ? await response.blob() : null;
      const file = blob ? new File([blob], "times-deutime.png", { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: eventTitle, text: "Times definidos no DeuTime", files: [file] });
      } else {
        await navigator.share({ title: eventTitle, text: "Confira os times definidos", url: absoluteEventUrl });
      }
      setMessage("Compartilhamento aberto.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Não foi possível compartilhar. Baixe a imagem ou copie o link.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(eventUrl, window.location.origin).toString());
      setMessage("Link copiado.");
    } catch {
      setMessage("Não foi possível copiar automaticamente.");
    }
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Button type="button" onClick={shareImage} className="col-span-2 min-h-12 sm:col-span-1">
        <Share2 aria-hidden /> Compartilhar imagem
      </Button>
      <Button asChild variant="outline" className="min-h-12">
        <a href={imageUrl} download><Download aria-hidden /> Baixar</a>
      </Button>
      <Button type="button" variant="outline" onClick={copyLink} className="min-h-12">
        <Copy aria-hidden /> Copiar link
      </Button>
      {message ? <p role="status" className="col-span-2 flex items-center gap-2 text-xs text-emerald-800 sm:col-span-3"><Check className="size-4" aria-hidden />{message}</p> : null}
    </div>
  );
}
