import { getAppUrl } from "@/lib/env/server";
import { recordNotificationCallback } from "@/lib/features/delivery/supabase-delivery-repository";
import {
  normalizeTwilioStatusCallback,
  parseCallbackToken,
  parseTwilioForm,
  TWILIO_STATUS_BODY_LIMIT,
  validateTwilioSignature,
} from "@/lib/features/delivery/twilio-status-callback";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  if (authToken.length < 16) return response(503);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return response(415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > TWILIO_STATUS_BODY_LIMIT) {
    return response(413);
  }

  const callbackToken = parseCallbackToken(request.nextUrl.searchParams);
  if (!callbackToken) return response(400);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > TWILIO_STATUS_BODY_LIMIT) {
    return response(413);
  }
  const params = parseTwilioForm(rawBody);
  const callbackUrl = new URL(
    `/api/integrations/twilio/whatsapp/status${request.nextUrl.search}`,
    getAppUrl(),
  ).toString();

  if (
    !validateTwilioSignature({
      authToken,
      signature: request.headers.get("x-twilio-signature"),
      callbackUrl,
      params,
    })
  ) {
    return response(403);
  }

  const callback = normalizeTwilioStatusCallback(params);
  if (!callback) return response(400);

  try {
    await recordNotificationCallback({
      callbackToken,
      ...callback,
    });
    return response(204);
  } catch {
    return response(503);
  }
}

function response(status: number) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
