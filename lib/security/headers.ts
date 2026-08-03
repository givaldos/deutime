import type { NextResponse } from "next/server";

export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
    // Development: unsafe-inline covers Next.js Dev Tools runtime styles.
    // Production: style elements remain nonce-restricted. Style attributes
    // are allowed separately because React, Next.js, GTM and Turnstile apply
    // runtime values through the DOM; nonces do not apply to style attributes.
    isDevelopment
      ? "style-src 'self' 'unsafe-inline'"
      : `style-src 'self' 'nonce-${nonce}'`,
    ...(isDevelopment ? [] : ["style-src-attr 'unsafe-inline'"]),
    `img-src 'self' blob: data: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com${isDevelopment ? " http://127.0.0.1:54321 http://localhost:54321" : ""}`,
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com${isDevelopment ? " http://127.0.0.1:54321 ws://127.0.0.1:54321 http://localhost:54321 ws://localhost:54321" : ""}`,
    "frame-src https://challenges.cloudflare.com https://www.googletagmanager.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function applySecurityHeaders(
  response: NextResponse,
  contentSecurityPolicy: string,
  pathname = "/",
) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("Referrer-Policy", referrerPolicyForPath(pathname));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (isPublicEventPath(pathname)) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export function isPublicEventPath(pathname: string) {
  return pathname === "/e" || pathname.startsWith("/e/");
}

export function shouldLoadThirdPartyAnalytics(pathname: string) {
  return !isPublicEventPath(pathname);
}

export function referrerPolicyForPath(pathname: string) {
  return pathname === "/auth/confirm" ||
    pathname === "/auth/recovery" ||
    pathname === "/auth/update-password" ||
    pathname.startsWith("/invite/") ||
    isPublicEventPath(pathname)
    ? "no-referrer"
    : "strict-origin-when-cross-origin";
}
