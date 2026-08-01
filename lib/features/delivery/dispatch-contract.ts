import { z } from "zod";

const uuidSchema = z.string().uuid();
const secretSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);
const templatePartSchema = z.string().regex(/^[a-z0-9_.-]{1,80}$/);

const preparedDispatchSchema = z.object({
  attempt_id: uuidSchema,
  recipient: phoneSchema,
  event_public_id: uuidSchema,
  credential_secret: secretSchema,
  callback_token: secretSchema,
  template_key: templatePartSchema,
  template_version: templatePartSchema,
  template_payload: z.object({
    event_public_id: uuidSchema,
    event_title: z.string().min(2).max(120),
    event_starts_at: z.string().datetime({ offset: true }),
    event_timezone: z.string().min(3).max(64).optional(),
    schedule_version: z.number().int().positive(),
  }),
});

export type PreparedDispatch = z.infer<typeof preparedDispatchSchema>;

export type WhatsAppDispatchCommand = {
  attemptId: string;
  recipient: string;
  template: {
    key: string;
    version: string;
    variables: Record<string, string>;
  };
  callbackUrl: string;
};

export type SendOutcome =
  | { kind: "accepted"; providerMessageId: string }
  | {
      kind: "rejected";
      failureClass: "transient" | "permanent";
      errorCode: string;
    }
  | { kind: "ambiguous"; errorCode: string };

export interface WhatsAppAdapter {
  send(
    command: WhatsAppDispatchCommand,
    signal?: AbortSignal,
  ): Promise<SendOutcome>;
}

export function parsePreparedDispatch(value: unknown): PreparedDispatch | null {
  const parsed = preparedDispatchSchema.safeParse(value);
  if (!parsed.success) return null;
  if (parsed.data.event_public_id !== parsed.data.template_payload.event_public_id) {
    return null;
  }
  return parsed.data;
}

export function buildWhatsAppDispatchCommand(
  prepared: PreparedDispatch,
  appUrl: URL,
): WhatsAppDispatchCommand {
  const eventUrl = new URL(`/e/${prepared.event_public_id}`, appUrl);
  eventUrl.hash = new URLSearchParams({ c: prepared.credential_secret }).toString();

  const callbackUrl = new URL(
    "/api/integrations/twilio/whatsapp/status",
    appUrl,
  );
  callbackUrl.searchParams.set("t", prepared.callback_token);

  return {
    attemptId: prepared.attempt_id,
    recipient: prepared.recipient,
    template: {
      key: prepared.template_key,
      version: prepared.template_version,
      variables: {
        event_title: prepared.template_payload.event_title,
        event_starts_at: prepared.template_payload.event_starts_at,
        ...(prepared.template_payload.event_timezone
          ? { event_timezone: prepared.template_payload.event_timezone }
          : {}),
        event_link: eventUrl.toString(),
      },
    },
    callbackUrl: callbackUrl.toString(),
  };
}
