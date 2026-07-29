"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useCallback } from "react";

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
  const id = useId();
  const containerId = `cf-turnstile-${id.replace(/:/g, "")}`;
  const widgetId = useRef<string | undefined>(undefined);

  const removeWidget = useCallback(() => {
    if (widgetId.current !== undefined && window.turnstile) {
      try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
      widgetId.current = undefined;
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!siteKey || !window.turnstile) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    removeWidget();
    widgetId.current = window.turnstile.render(container, {
      sitekey: siteKey,
      action,
      theme: "light",
    });
  }, [siteKey, action, containerId, removeWidget]);

  // If the script is already present when this component mounts (SPA navigation
  // or browser-cached script), render immediately.
  useEffect(() => {
    if (window.turnstile) renderWidget();
    return removeWidget;
  }, [renderWidget, removeWidget]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        nonce={nonce}
        onLoad={renderWidget}
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
