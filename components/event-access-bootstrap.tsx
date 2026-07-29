"use client";

import { readEventAccessFragment } from "@/lib/features/event-access/contract";
import { useEffect, useState } from "react";

type EventAccessBootstrapProps = {
  accessPath: string;
  clearInvalidCookie: boolean;
};

export function EventAccessBootstrap({
  accessPath,
  clearInvalidCookie,
}: EventAccessBootstrapProps) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const parsed = readEventAccessFragment(window.location.hash);

    if (!parsed.hadCredential) {
      if (clearInvalidCookie) {
        void fetch(accessPath, {
          method: "DELETE",
          credentials: "same-origin",
          cache: "no-store",
        });
      }
      return;
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    if (!parsed.credential) {
      queueMicrotask(() => {
        setMessage(
          "Não foi possível reconhecer este acesso. O evento público continua disponível.",
        );
      });
      return;
    }

    queueMicrotask(() => {
      setMessage("Preparando seu acesso seguro…");
    });

    void fetch(accessPath, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: parsed.credential }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("exchange_failed");
        }
        window.location.reload();
      })
      .catch(() => {
        setMessage(
          "Este acesso não está disponível. Você ainda pode consultar o evento ou entrar na sua agenda.",
        );
      });
  }, [accessPath, clearInvalidCookie]);

  return (
    <div
      data-testid="event-access-bootstrap"
      role="status"
      aria-live="polite"
      className={message ? "" : "sr-only"}
    >
      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          {message}
        </p>
      ) : null}
    </div>
  );
}
