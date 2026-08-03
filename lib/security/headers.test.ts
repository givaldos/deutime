import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";

import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  isPublicEventPath,
  referrerPolicyForPath,
  shouldLoadThirdPartyAnalytics,
} from "./headers";

describe("content security policy", () => {
  it("allows the runtime helpers required by Next.js only in development", () => {
    const policy = buildContentSecurityPolicy("development-nonce", true);

    expect(policy).toContain("script-src 'self' 'nonce-development-nonce' 'strict-dynamic' 'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("style-src 'self' 'nonce-development-nonce'");
    expect(policy).not.toContain("sha256-");
    expect(policy).toContain(
      "img-src 'self' blob: data: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com http://127.0.0.1:54321 http://localhost:54321",
    );
    expect(policy).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com http://127.0.0.1:54321 ws://127.0.0.1:54321 http://localhost:54321 ws://localhost:54321",
    );
  });

  it("keeps scripts and style elements nonce-restricted in production", () => {
    const policy = buildContentSecurityPolicy("production-nonce", false);

    expect(policy).toContain("script-src 'self' 'nonce-production-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-production-nonce'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("sha256-");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("http://127.0.0.1:54321");
    expect(policy).not.toContain("http://localhost:54321");
  });
});

describe("route security headers", () => {
  it("emits only supported permissions policy directives", () => {
    const response = applySecurityHeaders(
      NextResponse.next(),
      buildContentSecurityPolicy("test-nonce", false),
    );

    expect(response.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  it("keeps public event URLs out of referrers", () => {
    expect(isPublicEventPath("/e/b4000000-0000-4000-8000-000000000001")).toBe(
      true,
    );
    expect(referrerPolicyForPath("/e/b4000000-0000-4000-8000-000000000001")).toBe(
      "no-referrer",
    );
    expect(referrerPolicyForPath("/t/time-publico")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("preserves no-referrer on existing credential routes", () => {
    expect(referrerPolicyForPath("/auth/confirm")).toBe("no-referrer");
    expect(referrerPolicyForPath("/invite/opaque-token")).toBe("no-referrer");
  });

  it("blocks third-party analytics only on the initial public-event journey", () => {
    expect(
      shouldLoadThirdPartyAnalytics(
        "/e/b4000000-0000-4000-8000-000000000001",
      ),
    ).toBe(false);
    expect(shouldLoadThirdPartyAnalytics("/e")).toBe(false);
    expect(shouldLoadThirdPartyAnalytics("/t/time-publico")).toBe(true);
    expect(shouldLoadThirdPartyAnalytics("/app/time/events")).toBe(true);
  });
});
