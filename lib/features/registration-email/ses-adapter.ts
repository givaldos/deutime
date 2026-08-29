import "server-only";

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandOutput,
} from "@aws-sdk/client-sesv2";
import {
  registrationEmailContent,
  type RegistrationEmailAdapter,
} from "./contract";

export type RegistrationEmailSesConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  fromEmail: string;
  senderName: string;
  configurationSet: string;
};

type SesSender = {
  send(
    command: SendEmailCommand,
    options?: { abortSignal?: AbortSignal },
  ): Promise<SendEmailCommandOutput>;
};

export function parseRegistrationEmailSesConfig(
  env: NodeJS.ProcessEnv,
): RegistrationEmailSesConfig | null {
  const values = [
    env.AWS_REGION,
    env.AWS_ACCESS_KEY_ID,
    env.AWS_SECRET_ACCESS_KEY,
    env.AWS_SESSION_TOKEN,
    env.SES_FROM_EMAIL,
    env.SES_SENDER_NAME,
    env.SES_CONFIGURATION_SET,
  ];
  if (values.every((value) => !value)) return null;

  const region = env.AWS_REGION?.trim() ?? "";
  const fromEmail = env.SES_FROM_EMAIL?.trim() ?? "";
  const senderName = env.SES_SENDER_NAME?.trim() ?? "";
  const configurationSet = env.SES_CONFIGURATION_SET?.trim() ?? "";
  if (
    !/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(region) ||
    !env.AWS_ACCESS_KEY_ID?.trim() ||
    !env.AWS_SECRET_ACCESS_KEY ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail) ||
    !senderName ||
    /[\r\n]/.test(senderName) ||
    senderName.length > 80 ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(configurationSet)
  ) {
    throw new Error("Configuração AWS SES de avisos inválida.");
  }

  return {
    region,
    accessKeyId: env.AWS_ACCESS_KEY_ID.trim(),
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN || undefined,
    fromEmail,
    senderName,
    configurationSet,
  };
}

export function createRegistrationEmailSesAdapter(
  config: RegistrationEmailSesConfig,
  appUrl: URL,
  sender: SesSender = createSesClient(config),
): RegistrationEmailAdapter {
  return {
    async send(message) {
      const content = registrationEmailContent(message, appUrl);
      const command = new SendEmailCommand({
        FromEmailAddress: `${quotedDisplayName(config.senderName)} <${config.fromEmail}>`,
        Destination: { ToAddresses: [message.recipient] },
        Content: {
          Simple: {
            Subject: { Data: content.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: content.text, Charset: "UTF-8" },
              Html: { Data: content.html, Charset: "UTF-8" },
            },
          },
        },
        ConfigurationSetName: config.configurationSet,
        EmailTags: [{ Name: "message_type", Value: "registration_pending" }],
      });

      try {
        const result = await sender.send(command, {
          abortSignal: AbortSignal.timeout(12_000),
        });
        return result.MessageId
          ? { kind: "accepted", providerMessageId: result.MessageId }
          : { kind: "ambiguous", errorCode: "ses_missing_message_id" };
      } catch (error) {
        return classifySesFailure(error);
      }
    },
  };
}

type SesError = Error & {
  $metadata?: { httpStatusCode?: number };
};

const transientErrors = new Set([
  "InternalServiceErrorException",
  "RequestTimeout",
  "RequestTimeoutException",
  "ServiceUnavailable",
  "Throttling",
  "ThrottlingException",
  "TooManyRequestsException",
]);

const permanentErrors = new Set([
  "AccessDeniedException",
  "AccountSuspendedException",
  "BadRequestException",
  "CredentialsProviderError",
  "InvalidClientTokenId",
  "LimitExceededException",
  "MailFromDomainNotVerifiedException",
  "MessageRejected",
  "NotFoundException",
  "SendingPausedException",
  "SignatureDoesNotMatch",
  "UnrecognizedClientException",
]);

export function classifySesFailure(error: unknown) {
  const sesError = error as SesError;
  const name = sesError?.name || "unknown";
  const errorCode = normalizedErrorCode(name);
  const statusCode = sesError?.$metadata?.httpStatusCode;

  if (transientErrors.has(name) || statusCode === 429 || (statusCode && statusCode >= 500)) {
    return {
      kind: "rejected" as const,
      failureClass: "transient" as const,
      errorCode,
    };
  }
  if (permanentErrors.has(name) || (statusCode && statusCode >= 400)) {
    return {
      kind: "rejected" as const,
      failureClass: "permanent" as const,
      errorCode,
    };
  }
  return { kind: "ambiguous" as const, errorCode };
}

function createSesClient(config: RegistrationEmailSesConfig) {
  return new SESv2Client({
    region: config.region,
    maxAttempts: 1,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
    },
  });
}

function quotedDisplayName(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function normalizedErrorCode(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 76);
  return `ses_${normalized || "unknown"}`.slice(0, 80);
}
