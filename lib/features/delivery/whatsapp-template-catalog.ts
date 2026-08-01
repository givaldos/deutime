import type { WhatsAppDispatchCommand } from "./dispatch-contract";

export type TwilioTemplateProfile =
  | "event_call_v1"
  | "sandbox_appointment";

export const EVENT_CALL_TEMPLATE_V1 = {
  key: "event_call",
  version: "v1",
  content: {
    friendly_name: "deutime_event_call_v1",
    language: "pt_BR",
    variables: {
      "1": "Treino de sexta",
      "2": "02/08/2030 às 19:00",
      "3": "https://deutime.app/e/00000000-0000-4000-8000-000000000000#c=exemplo",
    },
    types: {
      "twilio/text": {
        body: "Olá! O evento {{1}} está marcado para {{2}}. Consulte os detalhes e responda à chamada pelo link {{3}}. Se você não reconhece este convite, ignore esta mensagem.",
      },
    },
  },
  approval: {
    name: "deutime_event_call_v1",
    category: "UTILITY",
  },
} as const;

export function renderTwilioTemplateVariables(
  command: WhatsAppDispatchCommand,
  profile: TwilioTemplateProfile,
) {
  const variables = command.template.variables;
  const eventTitle = required(variables.event_title);
  const eventStart = formatEventStart(
    required(variables.event_starts_at),
    variables.event_timezone,
  );
  const eventLink = required(variables.event_link);

  if (profile === "sandbox_appointment") {
    return {
      "1": `${eventTitle} em ${eventStart}`,
      "2": eventLink,
    };
  }

  return {
    "1": eventTitle,
    "2": eventStart,
    "3": eventLink,
  };
}

function formatEventStart(value: string, timeZone: string | undefined) {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || !timeZone) return value;

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(instant);
  } catch {
    return value;
  }
}

function required(value: string | undefined) {
  if (!value) throw new Error("Variável obrigatória do template ausente.");
  return value;
}
