import {
  type NormalizedTwilioStatusCallback,
  normalizeTwilioStatusCallback,
  parseTwilioForm,
  TWILIO_STATUS_BODY_LIMIT,
  validateTwilioSignature,
} from "@/lib/features/delivery/twilio-status-callback";
import { NextRequest, NextResponse } from "next/server";

type RecordCallback = (callback: NormalizedTwilioStatusCallback) => Promise<boolean>;

export async function handleTwilioStatusCallback(
  request: NextRequest,
  callbackUrl: string,
  recordCallback: RecordCallback,
) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  if (authToken.length < 16) return twilioCallbackResponse(503);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return twilioCallbackResponse(415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > TWILIO_STATUS_BODY_LIMIT) {
    return twilioCallbackResponse(413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > TWILIO_STATUS_BODY_LIMIT) {
    return twilioCallbackResponse(413);
  }
  const params = parseTwilioForm(rawBody);

  if (
    !validateTwilioSignature({
      authToken,
      signature: request.headers.get("x-twilio-signature"),
      callbackUrl,
      params,
    })
  ) {
    return twilioCallbackResponse(403);
  }

  const callback = normalizeTwilioStatusCallback(params);
  if (!callback) return twilioCallbackResponse(400);

  try {
    await recordCallback(callback);
    return twilioCallbackResponse(204);
  } catch {
    return twilioCallbackResponse(503);
  }
}

export function twilioCallbackResponse(status: number) {
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
