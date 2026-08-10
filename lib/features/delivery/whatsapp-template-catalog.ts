import type { WhatsAppDispatchCommand } from "./dispatch-contract";

export type TwilioTemplateProfile =
  | "event_call_v1"
  | "event_call_card_v1"
  | "event_call_card_v2"
  | "event_call_card_first_remember_v2"
  | "event_call_card_last_remember_v2"
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
      // Domínio fixo no template aprovado pela Meta; {{3}} carrega só o caminho.
      "3": "e/00000000-0000-4000-8000-000000000000#c=exemplo",
    },
    types: {
      "twilio/text": {
        body: "Olá! O evento {{1}} está marcado para {{2}}. Consulte os detalhes e responda à chamada pelo link https://deutime.app/{{3}}. Se você não reconhece este convite, ignore esta mensagem.",
      },
    },
  },
  approval: {
    name: "deutime_event_call_v1",
    category: "UTILITY",
  },
} as const;

const eventCallCardBody =
  "*Fala Craque* e *Camisa 10*\nVocê foi convocado para o jogo:\n*{{1}}*\nNo dia: *{{2}}*\nBora confirmar e bater uma bola com a galera?";

export const EVENT_CALL_CARD_TEMPLATE_V1 = {
  key: "event_call",
  version: "card_v1",
  content: {
    friendly_name: "deutime_event_call_card_v1",
    language: "pt_BR",
    variables: {
      "1": "Treino de sexta",
      "2": "02/08/2030 às 19:00",
      // {{3}} = path do link (botão), {{4}} = path da imagem (header).
      // Domínio fixo no template aprovado pela Meta.
      "3": "e/00000000-0000-4000-8000-000000000000#c=exemplo",
      "4": "e/00000000-0000-4000-8000-000000000000/convite.png",
    },
    types: {
      "whatsapp/card": {
        body: eventCallCardBody,
        footer: "Mudou de idéia? Entre no link e ajuste a resposta...",
        media: ["https://deutime.app/{{4}}"],
        actions: [
          {
            type: "URL",
            title: "Clique para Confirmar",
            url: "https://deutime.app/{{3}}",
          },
        ],
      },
    },
  },
  approval: {
    name: "deutime_event_call_card_v1",
    category: "UTILITY",
  },
} as const;

const reminderSamples = {
  "1": "Treino de sexta",
  "2": "02/08/2030 às 19:00",
  "3": "e/00000000-0000-4000-8000-000000000000#c=exemplo",
  "4": "e/00000000-0000-4000-8000-000000000000/convite.png",
} as const;

export const EVENT_REMINDER_FIRST_CARD_TEMPLATE_V2 = {
  key: "event_reminder",
  version: "first_card_v2",
  content: {
    friendly_name: "event_call_card_first_remember_v2",
    language: "pt_BR",
    variables: reminderSamples,
    types: {
      "whatsapp/card": {
        body: "⏰ *Ainda dá tempo de confirmar*\nO evento *{{1}}* acontece em *{{2}}*.\nO time está fechando a lista. Confirme sua presença agora.",
        footer: "Se já respondeu, não enviaremos outro igual.",
        media: ["https://deutime.app/{{4}}"],
        actions: [
          {
            type: "URL",
            title: "Confirmar presença",
            url: "https://deutime.app/{{3}}",
          },
        ],
      },
      "twilio/text": {
        body: "⏰ Ainda dá tempo de confirmar\nO evento {{1}} acontece em {{2}}. O time está fechando a lista. Confirme agora: https://deutime.app/{{3}}",
      },
    },
  },
  approval: {
    name: "event_call_card_first_remember_v2",
    category: "UTILITY",
  },
} as const;

export const EVENT_REMINDER_LAST_CARD_TEMPLATE_V2 = {
  key: "event_reminder",
  version: "last_card_v2",
  content: {
    friendly_name: "event_call_card_last_remember_v2",
    language: "pt_BR",
    variables: reminderSamples,
    types: {
      "whatsapp/card": {
        body: "🚨 *Última chamada*\nO evento *{{1}}* acontece em *{{2}}*.\nA confirmação fecha em breve. Registre sua resposta agora.",
        footer: "Última cobrança automática deste evento.",
        media: ["https://deutime.app/{{4}}"],
        actions: [
          {
            type: "URL",
            title: "Responder agora",
            url: "https://deutime.app/{{3}}",
          },
        ],
      },
      "twilio/text": {
        body: "🚨 Última chamada\nO evento {{1}} acontece em {{2}}. A confirmação fecha em breve. Responda agora: https://deutime.app/{{3}}",
      },
    },
  },
  approval: {
    name: "event_call_card_last_remember_v2",
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

  if (
    profile === "event_call_card_v1" ||
    profile === "event_call_card_v2" ||
    profile === "event_call_card_first_remember_v2" ||
    profile === "event_call_card_last_remember_v2"
  ) {
    const eventMediaUrl = required(variables.event_media_url);
    return {
      "1": eventTitle,
      "2": eventStart,
      "3": eventLink,
      "4": eventMediaUrl,
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
