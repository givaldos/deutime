import { z } from "zod";

const sandboxSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[A-Fa-f0-9]{32}$/),
  TWILIO_AUTH_TOKEN: z.string().min(16).max(128),
  TWILIO_WHATSAPP_FROM: z.literal("+14155238886"),
  TWILIO_CONTENT_SID_EVENT_CALL_V1: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/),
  TWILIO_TEMPLATE_PROFILE: z.literal("sandbox_appointment"),
  WHATSAPP_PILOT_TEAM_ID: z.string().uuid(),
  WHATSAPP_PILOT_RECIPIENT: z.string().regex(/^\+[1-9]\d{7,14}$/),
});

export type TwilioPilotConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  pilotTeamId: string;
  pilotRecipient: string;
  templates: {
    "event_call:v1": {
      contentSid: string;
      profile: "sandbox_appointment";
    };
  };
};

export function parseTwilioPilotConfig(
  env: Record<string, string | undefined>,
): TwilioPilotConfig | null {
  if (env.WHATSAPP_PILOT_MODE !== "sandbox") return null;

  const parsed = sandboxSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Configuração do piloto Sandbox inválida.");
  }

  return {
    accountSid: parsed.data.TWILIO_ACCOUNT_SID,
    authToken: parsed.data.TWILIO_AUTH_TOKEN,
    from: parsed.data.TWILIO_WHATSAPP_FROM,
    pilotTeamId: parsed.data.WHATSAPP_PILOT_TEAM_ID,
    pilotRecipient: parsed.data.WHATSAPP_PILOT_RECIPIENT,
    templates: {
      "event_call:v1": {
        contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_V1,
        profile: parsed.data.TWILIO_TEMPLATE_PROFILE,
      },
    },
  };
}
