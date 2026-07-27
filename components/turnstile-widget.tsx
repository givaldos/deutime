"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

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
  const containerId = useId().replace(/:/g, "");
  const widgetId = useRef<string | undefined>(undefined);

  // Renders (or re-renders) the widget whenever the component mounts.
  // This covers SPA navigation: login → home → login, login → sign-up, etc.
  useEffect(() => {
    if (!siteKey) return;

    function render() {
      const container = document.getElementById(containerId);
      if (!container || !window.turnstile) return;

      // Remove any previous widget occupying this container.
      if (widgetId.current !== undefined) {
        try { window.turnstile!.remove(widgetId.current); } catch { /* ignore */ }
        widgetId.current = undefined;
      }

      widgetId.current = window.turnstile!.render(container, {
        sitekey: siteKey,
        action,
        theme: "light",
      });
    }

    // If Turnstile is already loaded, render immediately.
    if (window.turnstile) {
      render();
    } else {
      // Otherwise wait for the script onLoad callback set on the <Script> tag.
      (window as unknown as Record<string, unknown>).__onTurnstileLoad = render;
    }

    return () => {
      if (widgetId.current !== undefined && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
        widgetId.current = undefined;
      }
    };
  }, [siteKey, action, containerId]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__onTurnstileLoad&render=explicit"
        strategy="afterInteractive"
        nonce={nonce}
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
