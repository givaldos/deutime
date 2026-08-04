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
  // A Meta exige que o domínio fique fixo no template aprovado; apenas o
  // caminho (sem "/" inicial) vai nas variáveis {{3}} e {{4}}.
  const credentialParams = new URLSearchParams({ c: prepared.credential_secret });
  const eventLinkPath = `e/${prepared.event_public_id}#${credentialParams.toString()}`;
  const eventMediaPath = `e/${prepared.event_public_id}/convite.png`;

  const callbackUrl = new URL(
    `/api/integrations/twilio/whatsapp/status/${prepared.attempt_id}`,
    appUrl,
  );

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
        event_link: eventLinkPath,
        event_media_url: eventMediaPath,
      },
    },
    callbackUrl: callbackUrl.toString(),
  };
}
