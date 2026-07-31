import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeEventAccessCredential: vi.fn(),
}));

vi.mock("@/lib/data/event-access", () => ({
  exchangeEventAccessCredential: mocks.exchangeEventAccessCredential,
}));

import { NextRequest } from "next/server";
import { DELETE, POST } from "./route";

const publicId = "b4000000-0000-4000-8000-000000000001";
const credential = "A".repeat(43);
const capability = "B".repeat(43);
const endpoint = `https://deutime.app/e/${publicId}/access`;
const context = { params: Promise.resolve({ publicId }) };

function postRequest(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest(endpoint, {
    method: "POST",
    headers: {
      origin: "https://deutime.app",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("event credential exchange route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects cross-origin requests before reading the credential", async () => {
    const response = await POST(
      postRequest(
        { credential },
        {
          origin: "https://example.test",
          "sec-fetch-site": "cross-site",
        },
      ),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks.exchangeEventAccessCredential).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(credential);
  });

  it("requires JSON and a canonical base64url credential", async () => {
    const wrongType = await POST(
      postRequest({ credential }, { "content-type": "text/plain" }),
      context,
    );
    const misleadingType = await POST(
      postRequest(
        { credential },
        { "content-type": "application/json-malicious" },
      ),
      context,
    );
    const malformed = await POST(postRequest({ credential: "curto" }), context);

    expect(wrongType.status).toBe(415);
    expect(misleadingType.status).toBe(415);
    expect(malformed.status).toBe(404);
    expect(mocks.exchangeEventAccessCredential).not.toHaveBeenCalled();
  });

  it("bounds chunked bodies and rejects ambiguous JSON objects", async () => {
    const oversized = new NextRequest(endpoint, {
      method: "POST",
      headers: {
        origin: "https://deutime.app",
        "sec-fetch-site": "same-origin",
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        credential,
        padding: "á".repeat(1024),
      }),
    });
    oversized.headers.delete("content-length");

    const extraField = await POST(
      postRequest({ credential, redirect: "https://example.test" }),
      context,
    );
    const oversizedResponse = await POST(oversized, context);

    expect(extraField.status).toBe(404);
    expect(oversizedResponse.status).toBe(404);
    expect(mocks.exchangeEventAccessCredential).not.toHaveBeenCalled();
  });

  it("sets an HttpOnly path-scoped cookie without returning its secret", async () => {
    mocks.exchangeEventAccessCredential.mockResolvedValue({
      secret: capability,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const response = await POST(postRequest({ credential }), context);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(setCookie).toContain("dt_event_access=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain(`Path=/e/${publicId}`);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(response.headers.get("cross-origin-resource-policy")).toBe(
      "same-origin",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect([...response.headers.entries()].join("\n")).not.toContain(credential);
  });

  it("uses the same generic absence for an invalid or disabled exchange", async () => {
    mocks.exchangeEventAccessCredential.mockResolvedValue(null);

    const response = await POST(postRequest({ credential }), context);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Acesso indisponível." });
  });

  it("clears only the cookie scoped to the current event", async () => {
    const request = new NextRequest(endpoint, {
      method: "DELETE",
      headers: {
        origin: "https://deutime.app",
        "sec-fetch-site": "same-origin",
      },
    });

    const response = await DELETE(request, context);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(204);
    expect(setCookie).toContain("dt_event_access=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain(`Path=/e/${publicId}`);
  });
});
