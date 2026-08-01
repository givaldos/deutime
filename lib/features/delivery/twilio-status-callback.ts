import twilio from "twilio";
import { z } from "zod";

export const TWILIO_STATUS_BODY_LIMIT = 16 * 1024;

export type TwilioFormParams = Record<string, string | string[]>;

export type NormalizedTwilioStatusCallback = {
  providerMessageId: string;
  deliveryStatus:
    | "accepted"
    | "queued"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "undelivered";
  errorCode: string | null;
};

const callbackTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const providerMessageIdSchema = z
  .string()
  .regex(/^(?:SM|MM)[0-9A-Fa-f]{32}$/);
const providerErrorSchema = z.string().regex(/^\d{1,10}$/);

const statusMap: Record<
  string,
  NormalizedTwilioStatusCallback["deliveryStatus"]
> = {
  accepted: "accepted",
  scheduled: "accepted",
  queued: "queued",
  sending: "queued",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "undelivered",
  canceled: "failed",
};

export function parseTwilioForm(rawBody: string): TwilioFormParams {
  const parsed = new URLSearchParams(rawBody);
  const params: TwilioFormParams = {};

  for (const [key, value] of parsed) {
    const current = params[key];
    if (current === undefined) params[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else params[key] = [current, value];
  }

  return params;
}

export function validateTwilioSignature(input: {
  authToken: string;
  signature: string | null;
  callbackUrl: string;
  params: TwilioFormParams;
}) {
  if (input.authToken.length < 16 || !input.signature) return false;
  return twilio.validateRequest(
    input.authToken,
    input.signature,
    input.callbackUrl,
    input.params,
  );
}

export function parseCallbackToken(searchParams: URLSearchParams) {
  const entries = Array.from(searchParams.entries());
  if (entries.length !== 1 || entries[0]?.[0] !== "t") return null;
  const parsed = callbackTokenSchema.safeParse(entries[0][1]);
  return parsed.success ? parsed.data : null;
}

export function normalizeTwilioStatusCallback(
  params: TwilioFormParams,
): NormalizedTwilioStatusCallback | null {
  const sid = single(params.MessageSid);
  const rawStatus = single(params.MessageStatus)?.toLowerCase();
  const parsedSid = providerMessageIdSchema.safeParse(sid);
  const deliveryStatus = rawStatus ? statusMap[rawStatus] : undefined;
  if (!parsedSid.success || !deliveryStatus) return null;

  const rawErrorCode = single(params.ErrorCode);
  if (rawErrorCode !== undefined && !providerErrorSchema.safeParse(rawErrorCode).success) {
    return null;
  }

  return {
    providerMessageId: parsedSid.data,
    deliveryStatus,
    errorCode:
      rawErrorCode !== undefined
        ? `twilio_${rawErrorCode}`
        : deliveryStatus === "failed" || deliveryStatus === "undelivered"
          ? `twilio_${rawStatus}`
          : null,
  };
}

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
