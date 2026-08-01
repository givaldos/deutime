import type {
  WhatsAppAdapter,
  WhatsAppDispatchCommand,
} from "./dispatch-contract";
import {
  renderTwilioTemplateVariables,
  type TwilioTemplateProfile,
} from "./whatsapp-template-catalog";

type TwilioTemplateConfig = {
  contentSid: string;
  profile: TwilioTemplateProfile;
};

type TwilioAdapterConfig = {
  accountSid: string;
  authToken: string;
  from?: string;
  messagingServiceSid?: string;
  templates: Record<string, TwilioTemplateConfig>;
  timeoutMs?: number;
};

type FetchLike = typeof fetch;

export function createTwilioWhatsAppAdapter(
  config: TwilioAdapterConfig,
  fetchImpl: FetchLike = fetch,
): WhatsAppAdapter {
  validateConfig(config);

  return {
    async send(command, signal) {
      const template = config.templates[templateIdentifier(command)] ?? null;
      if (!template) {
        return {
          kind: "rejected",
          failureClass: "permanent",
          errorCode: "template_not_configured",
        };
      }

      const body = new URLSearchParams({
        To: `whatsapp:${command.recipient}`,
        ContentSid: template.contentSid,
        ContentVariables: JSON.stringify(
          renderTwilioTemplateVariables(command, template.profile),
        ),
        StatusCallback: command.callbackUrl,
      });
      if (config.messagingServiceSid) {
        body.set("MessagingServiceSid", config.messagingServiceSid);
      } else {
        body.set("From", normalizeSender(config.from!));
      }

      const timeoutSignal = AbortSignal.timeout(config.timeoutMs ?? 10_000);
      const requestSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;

      let response: Response;
      try {
        response = await fetchImpl(
          `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              authorization: `Basic ${Buffer.from(
                `${config.accountSid}:${config.authToken}`,
              ).toString("base64")}`,
              "content-type": "application/x-www-form-urlencoded",
            },
            body,
            signal: requestSignal,
          },
        );
      } catch {
        return { kind: "ambiguous", errorCode: "provider_network_unknown" };
      }

      const providerBody = await readProviderBody(response);
      if (response.ok) {
        const sid = providerBody?.sid;
        return typeof sid === "string" && /^(?:SM|MM)[0-9A-Fa-f]{32}$/.test(sid)
          ? { kind: "accepted", providerMessageId: sid }
          : { kind: "ambiguous", errorCode: "provider_response_invalid" };
      }

      return {
        kind: "rejected",
        failureClass:
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
            ? "transient"
            : "permanent",
        errorCode: normalizeProviderError(response.status, providerBody?.code),
      };
    },
  };
}

function validateConfig(config: TwilioAdapterConfig) {
  if (!/^AC[A-Za-z0-9]{8,253}$/.test(config.accountSid)) {
    throw new Error("TWILIO_ACCOUNT_SID inválido.");
  }
  if (config.authToken.length < 16) {
    throw new Error("TWILIO_AUTH_TOKEN inválido.");
  }
  if (Boolean(config.from) === Boolean(config.messagingServiceSid)) {
    throw new Error("Configure From ou MessagingServiceSid, exclusivamente.");
  }
  if (config.from && !/^(?:whatsapp:)?\+[1-9]\d{7,14}$/.test(config.from)) {
    throw new Error("Sender de WhatsApp inválido.");
  }
  if (
    config.messagingServiceSid &&
    !/^MG[A-Za-z0-9]{8,253}$/.test(config.messagingServiceSid)
  ) {
    throw new Error("MessagingServiceSid inválido.");
  }
  for (const template of Object.values(config.templates)) {
    if (!/^HX[A-Fa-f0-9]{32}$/.test(template.contentSid)) {
      throw new Error("ContentSid inválido.");
    }
  }
}

function templateIdentifier(command: WhatsAppDispatchCommand) {
  return `${command.template.key}:${command.template.version}`;
}

function normalizeSender(sender: string) {
  return sender.startsWith("whatsapp:") ? sender : `whatsapp:${sender}`;
}

async function readProviderBody(response: Response) {
  const value: unknown = await response.json().catch(() => null);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  return {
    sid: candidate.sid,
    code:
      typeof candidate.code === "number" || typeof candidate.code === "string"
        ? String(candidate.code)
        : null,
  };
}

function normalizeProviderError(status: number, code: string | null | undefined) {
  const normalizedCode = code?.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 70);
  return normalizedCode
    ? `twilio_${normalizedCode}`
    : `twilio_http_${status}`;
}
