"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, params: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  nonce,
  action,
}: {
  siteKey?: string;
  nonce?: string;
  action: string;
}) {
  const containerId = "cf-turnstile-" + useId().replace(/:/g, "");
  const widgetId = useRef<string | undefined>(undefined);
  // scriptReady flips to true when the <Script> onLoad fires OR when
  // window.turnstile already exists at mount time (cached script).
  const [scriptReady, setScriptReady] = useState(false);

  // On mount, check if the script was already loaded by a previous page visit.
  useEffect(() => {
    if (window.turnstile) setScriptReady(true);
  }, []);

  // Render / re-render whenever the script becomes ready or action changes.
  useEffect(() => {
    if (!siteKey || !scriptReady) return;

    const container = document.getElementById(containerId);
    if (!container || !window.turnstile) return;

    // Remove any previous widget in this container.
    if (widgetId.current !== undefined) {
      try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
      widgetId.current = undefined;
    }

    widgetId.current = window.turnstile.render(container, {
      sitekey: siteKey,
      action,
      theme: "light",
    });

    return () => {
      if (widgetId.current !== undefined && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
        widgetId.current = undefined;
      }
    };
  }, [siteKey, action, containerId, scriptReady]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        nonce={nonce}
        onLoad={() => setScriptReady(true)}
      />
      <div id={containerId} />
    </>
  );
}

export function getTurnstileToken(form: HTMLFormElement) {
  return new FormData(form).get("cf-turnstile-response")?.toString() || undefined;
}

export function resetTurnstile() {
  window.turnstile?.reset();
}
