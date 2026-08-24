import { createHmac, timingSafeEqual } from "node:crypto";
import {
  parse as parseQueryString,
  stringify as stringifyQueryString,
} from "node:querystring";
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
const callbackAttemptIdSchema = z.string().uuid();
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
  const signature = input.signature;
  const url = new URL(input.callbackUrl);
  const candidates = [removePort(url), addPort(url)];
  candidates.push(...candidates.map(withLegacyQueryString));

  return candidates.some((candidate) => {
    const expected = expectedTwilioSignature(
      input.authToken,
      candidate,
      input.params,
    );
    return constantTimeEqual(signature, expected);
  });
}

export function parseCallbackToken(searchParams: URLSearchParams) {
  const entries = Array.from(searchParams.entries());
  if (entries.length !== 1 || entries[0]?.[0] !== "t") return null;
  const parsed = callbackTokenSchema.safeParse(entries[0][1]);
  return parsed.success ? parsed.data : null;
}

export function parseCallbackAttemptId(value: string) {
  const parsed = callbackAttemptIdSchema.safeParse(value);
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

function expectedTwilioSignature(
  authToken: string,
  url: string,
  params: TwilioFormParams,
) {
  const payload = Object.keys(params)
    .sort()
    .reduce(
      (current, key) => current + formSignatureValue(key, params[key]),
      url,
    );

  // Exceção protocolar: isto não deriva senha. A Twilio exige HMAC-SHA1 no
  // cabeçalho X-Twilio-Signature; trocar o algoritmo rejeitaria callbacks reais.
  return createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
}

function formSignatureValue(name: string, value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return [...new Set(value)]
      .sort()
      .map((entry) => `${name}${entry}`)
      .join("");
  }
  return `${name}${value ?? ""}`;
}

function constantTimeEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  const lengthsMatch = receivedBuffer.length === expectedBuffer.length;

  return lengthsMatch
    ? timingSafeEqual(receivedBuffer, expectedBuffer)
    : !timingSafeEqual(receivedBuffer, receivedBuffer);
}

function removePort(url: URL) {
  const withoutPort = new URL(url);
  withoutPort.port = "";
  return withoutPort.toString();
}

function addPort(url: URL) {
  if (url.port) return url.toString();

  const port = url.protocol === "https:" ? ":443" : ":80";
  const credentials = `${url.username}${url.password ? `:${url.password}` : ""}`;
  const authority = credentials ? `${credentials}@` : "";
  return `${url.protocol}//${authority}${url.host}${port}${url.pathname}${url.search}${url.hash}`;
}

function withLegacyQueryString(url: string) {
  const parsed = new URL(url);
  if (!parsed.search) return url;

  const query = stringifyQueryString(parseQueryString(parsed.search.slice(1)));
  parsed.search = "";
  return `${parsed.toString()}?${query}`;
}
