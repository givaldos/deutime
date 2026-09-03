import { z } from "zod";
import type { TwilioTemplateProfile } from "./whatsapp-template-catalog";

const sandboxSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[A-Fa-f0-9]{32}$/),
  TWILIO_AUTH_TOKEN: z.string().min(16).max(128),
  // Aceita o número Sandbox compartilhado ou o sender próprio de produção.
  TWILIO_WHATSAPP_FROM: z.string().regex(/^\+[1-9]\d{7,14}$/),
  TWILIO_CONTENT_SID_EVENT_CALL_V1: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_CONTENT_SID_EVENT_CALL_CARD_V2: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_TEMPLATE_PROFILE: z.enum([
    "sandbox_appointment",
    "event_call_v1",
    "event_call_card_v1",
    "event_call_card_v2",
  ] satisfies TwilioTemplateProfile[]),
  WHATSAPP_PILOT_TEAM_ID: z.string().uuid(),
  WHATSAPP_PILOT_RECIPIENT: z.string().regex(/^\+[1-9]\d{7,14}$/),
});

// Schema para o worker geral de produção — sem restrição de destinatário único.
const productionSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[A-Fa-f0-9]{32}$/),
  TWILIO_AUTH_TOKEN: z.string().min(16).max(128),
  TWILIO_WHATSAPP_FROM: z.string().regex(/^\+[1-9]\d{7,14}$/),
  TWILIO_CONTENT_SID_EVENT_CALL_V1: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_CONTENT_SID_EVENT_CALL_CARD_V2: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_CONTENT_SID_EVENT_CALL_CARD_FIRST_REMEMBER_V2: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_CONTENT_SID_EVENT_CALL_CARD_LAST_REMEMBER_V2: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
  TWILIO_CONTENT_SID_EVENT_SCHEDULE_CHANGE_V1: z
    .string()
    .regex(/^HX[A-Fa-f0-9]{32}$/)
    .optional(),
});

export type TwilioProductionConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  templates: Record<
    string,
    {
      contentSid: string;
      profile: TwilioTemplateProfile;
    }
  >;
};

export type TwilioPilotConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  pilotTeamId: string;
  pilotRecipient: string;
  templates: Record<
    string,
    {
      contentSid: string;
      profile: TwilioTemplateProfile;
    }
  >;
};

export function parseTwilioPilotConfig(
  env: Record<string, string | undefined>,
): TwilioPilotConfig | null {
  if (env.WHATSAPP_PILOT_MODE !== "sandbox") return null;

  const parsed = sandboxSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Configuração do piloto Sandbox inválida.");
  }

  const profile = parsed.data.TWILIO_TEMPLATE_PROFILE;
  const selected =
    profile === "event_call_card_v1"
      ? {
          contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1,
          templateIdentifier: "event_call:card_v1",
        }
      : profile === "event_call_card_v2"
        ? {
            contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_V2,
            templateIdentifier: "event_call:card_v2",
          }
        : {
            contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_V1,
            templateIdentifier: "event_call:v1",
          };
  const { contentSid, templateIdentifier } = selected;
  if (!contentSid || !/^HX[A-Fa-f0-9]{32}$/.test(contentSid)) {
    throw new Error("Configuração do piloto Sandbox inválida.");
  }

  return {
    accountSid: parsed.data.TWILIO_ACCOUNT_SID,
    authToken: parsed.data.TWILIO_AUTH_TOKEN,
    from: parsed.data.TWILIO_WHATSAPP_FROM,
    pilotTeamId: parsed.data.WHATSAPP_PILOT_TEAM_ID,
    pilotRecipient: parsed.data.WHATSAPP_PILOT_RECIPIENT,
    templates: {
      [templateIdentifier]: {
        contentSid,
        profile,
      },
    },
  };
}

/**
 * Configura o adapter para o worker geral de produção.
 * Não exige WHATSAPP_PILOT_MODE; basta ter TWILIO_ACCOUNT_SID, AUTH_TOKEN,
 * FROM e ao menos um Content SID de template válido.
 * Retorna null se as variáveis obrigatórias estiverem ausentes (worker fica
 * em dry-run). Lança se estiverem presentes mas com formato inválido.
 */
export function parseTwilioProductionConfig(
  env: Record<string, string | undefined>,
): TwilioProductionConfig | null {
  // Se nenhuma credencial estiver definida, mantém dry-run silenciosamente.
  if (!env.TWILIO_ACCOUNT_SID && !env.TWILIO_AUTH_TOKEN) return null;

  const parsed = productionSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Configuração Twilio de produção inválida.");
  }

  const templates: TwilioProductionConfig["templates"] = {};

  if (parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_V1) {
    templates["event_call:v1"] = {
      contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_V1,
      profile: "event_call_v1",
    };
  }
  if (parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1) {
    templates["event_call:card_v1"] = {
      contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1,
      profile: "event_call_card_v1",
    };
  }
  if (parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_V2) {
    templates["event_call:card_v2"] = {
      contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_V2,
      profile: "event_call_card_v2",
    };
  }
  if (parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_FIRST_REMEMBER_V2) {
    templates["event_reminder:first_card_v2"] = {
      contentSid:
        parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_FIRST_REMEMBER_V2,
      profile: "event_call_card_first_remember_v2",
    };
  }
  if (parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_LAST_REMEMBER_V2) {
    templates["event_reminder:last_card_v2"] = {
      contentSid:
        parsed.data.TWILIO_CONTENT_SID_EVENT_CALL_CARD_LAST_REMEMBER_V2,
      profile: "event_call_card_last_remember_v2",
    };
  }
  if (parsed.data.TWILIO_CONTENT_SID_EVENT_SCHEDULE_CHANGE_V1) {
    templates["event_schedule_change:v1"] = {
      contentSid: parsed.data.TWILIO_CONTENT_SID_EVENT_SCHEDULE_CHANGE_V1,
      profile: "event_schedule_change_v1",
    };
  }

  if (Object.keys(templates).length === 0) {
    throw new Error("Configuração Twilio de produção inválida.");
  }

  return {
    accountSid: parsed.data.TWILIO_ACCOUNT_SID,
    authToken: parsed.data.TWILIO_AUTH_TOKEN,
    from: parsed.data.TWILIO_WHATSAPP_FROM,
    templates,
  };
}
