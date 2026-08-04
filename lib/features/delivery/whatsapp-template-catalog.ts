import type { WhatsAppDispatchCommand } from "./dispatch-contract";

export type TwilioTemplateProfile =
  | "event_call_v1"
  | "event_call_card_v1"
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

const eventCallBody =
  "⚽ CONVOCAÇÃO: {{1}}\n📅 {{2}}\n\nA lista acabou de abrir. Contamos com teu nome, craque. Com 1 toque você confirma presença 👇\nhttps://deutime.app/{{3}}\n\nSem senha, sem cadastro. Só clicar no link. Mudou o plano? Volta no link e troca a resposta.";

export const EVENT_CALL_CARD_TEMPLATE_V1 = {
  key: "event_call",
  version: "card_v1",
  content: {
    friendly_name: "deutime_event_call_card_v1",
    language: "pt_BR",
    variables: {
      "1": "Treino de sexta",
      "2": "02/08/2030 às 19:00",
      // Domínio fixo no template aprovado pela Meta; {{3}} e {{4}} carregam só o caminho.
      "3": "e/00000000-0000-4000-8000-000000000000#c=exemplo",
      "4": "e/00000000-0000-4000-8000-000000000000/convite.png",
    },
    types: {
      "twilio/card": {
        title: eventCallBody,
        media: ["https://deutime.app/{{4}}"],
      },
      "twilio/text": {
        body: eventCallBody,
      },
    },
  },
  approval: {
    name: "deutime_event_call_card_v1",
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

  if (profile === "event_call_card_v1") {
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
