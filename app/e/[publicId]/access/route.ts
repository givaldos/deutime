import { exchangeEventAccessCredential } from "@/lib/data/event-access";
import {
  EVENT_ACCESS_COOKIE_NAME,
  eventAccessCookiePath,
  isEventAccessSecret,
} from "@/lib/features/event-access/contract";
import { isPublicEventId } from "@/lib/features/public-event/presentation";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

const genericFailure = { message: "Acesso indisponível." };
const maxRequestBodyBytes = 1024;

export async function POST(request: NextRequest, context: RouteContext) {
  const { publicId } = await context.params;

  if (!isPublicEventId(publicId)) {
    return unavailable();
  }
  if (!isSameOrigin(request)) {
    return json(genericFailure, 403);
  }
  if (!isJsonRequest(request)) {
    return json(genericFailure, 415);
  }

  const credential = await readCredential(request);

  if (!credential) {
    return unavailable();
  }

  const exchanged = await exchangeEventAccessCredential(publicId, credential);
  if (!exchanged) {
    return unavailable();
  }

  const expiresAt = new Date(exchanged.expiresAt);
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  if (!Number.isFinite(expiresAt.getTime()) || maxAge === 0) {
    return unavailable();
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: noStoreHeaders(),
  });
  response.cookies.set(EVENT_ACCESS_COOKIE_NAME, exchanged.secret, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: eventAccessCookiePath(publicId),
    expires: expiresAt,
    maxAge,
  });
  return response;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { publicId } = await context.params;
  if (!isPublicEventId(publicId)) {
    return unavailable();
  }
  if (!isSameOrigin(request)) {
    return json(genericFailure, 403);
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: noStoreHeaders(),
  });
  response.cookies.set(EVENT_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: eventAccessCookiePath(publicId),
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || (fetchSite && fetchSite !== "same-origin")) return false;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function isJsonRequest(request: NextRequest) {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";")
    .at(0)
    ?.trim()
    .toLowerCase();
  return mediaType === "application/json";
}

async function readCredential(request: NextRequest) {
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) ||
      Number(declaredLength) > maxRequestBodyBytes)
  ) {
    return null;
  }

  const rawBody = await request.text().catch(() => null);
  if (
    rawBody === null ||
    new TextEncoder().encode(rawBody).byteLength > maxRequestBodyBytes
  ) {
    return null;
  }

  const body = parseJsonObject(rawBody);
  if (!body || Object.keys(body).length !== 1) return null;
  return isEventAccessSecret(body.credential) ? body.credential : null;
}

function parseJsonObject(rawBody: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    return parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function unavailable() {
  return json(genericFailure, 404);
}

function json(body: typeof genericFailure, status: number) {
  return NextResponse.json(body, {
    status,
    headers: noStoreHeaders(),
  });
}

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}
