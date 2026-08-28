import "server-only";

import nodemailer from "nodemailer";
import {
  registrationEmailContent,
  type RegistrationEmailAdapter,
} from "./contract";

export type RegistrationEmailSmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  senderName: string;
};

export function parseRegistrationEmailSmtpConfig(
  env: NodeJS.ProcessEnv,
): RegistrationEmailSmtpConfig | null {
  const values = [
    env.SMTP_HOST,
    env.SMTP_PORT,
    env.SMTP_USER,
    env.SMTP_PASSWORD,
    env.SMTP_FROM_EMAIL,
    env.SMTP_SENDER_NAME,
  ];
  if (values.every((value) => !value)) return null;

  const port = Number(env.SMTP_PORT);
  const email = env.SMTP_FROM_EMAIL?.trim() ?? "";
  if (
    !env.SMTP_HOST?.trim() ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    !env.SMTP_SENDER_NAME?.trim()
  ) {
    throw new Error("Configuração SMTP de avisos inválida.");
  }

  return {
    host: env.SMTP_HOST.trim(),
    port,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromEmail: email,
    senderName: env.SMTP_SENDER_NAME.trim(),
  };
}

export function createRegistrationEmailSmtpAdapter(
  config: RegistrationEmailSmtpConfig,
  appUrl: URL,
): RegistrationEmailAdapter {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });

  return {
    async send(message) {
      const content = registrationEmailContent(message, appUrl);
      try {
        const result = await transport.sendMail({
          from: { name: config.senderName, address: config.fromEmail },
          to: message.recipient,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });
        return result.messageId
          ? { kind: "accepted", providerMessageId: result.messageId }
          : { kind: "ambiguous", errorCode: "smtp_missing_message_id" };
      } catch (error) {
        return classifySmtpFailure(error);
      }
    },
  };
}

type SmtpError = Error & {
  code?: string;
  command?: string;
  responseCode?: number;
};

export function classifySmtpFailure(error: unknown) {
  const smtpError = error as SmtpError;
  const responseCode = smtpError?.responseCode;
  if (responseCode && responseCode >= 500) {
    return {
      kind: "rejected" as const,
      failureClass: "permanent" as const,
      errorCode: `smtp_${responseCode}`,
    };
  }
  if (responseCode && responseCode >= 400) {
    return {
      kind: "rejected" as const,
      failureClass: "transient" as const,
      errorCode: `smtp_${responseCode}`,
    };
  }

  const code = normalizedErrorCode(smtpError?.code);
  const beforeMessage = ["CONN", "EHLO", "HELO", "AUTH", "MAIL FROM", "RCPT TO"].includes(
    smtpError?.command ?? "",
  );
  return beforeMessage
    ? {
        kind: "rejected" as const,
        failureClass: "transient" as const,
        errorCode: code,
      }
    : { kind: "ambiguous" as const, errorCode: code };
}

function normalizedErrorCode(code?: string) {
  const normalized = (code ?? "smtp_unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 70);
  return `smtp_${normalized || "unknown"}`.slice(0, 80);
}
