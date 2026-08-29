import { describe, expect, it, vi } from "vitest";
import type { SendEmailCommand } from "@aws-sdk/client-sesv2";

vi.mock("server-only", () => ({}));
import {
  classifySesFailure,
  createRegistrationEmailSesAdapter,
  parseRegistrationEmailSesConfig,
} from "./ses-adapter";

const config = {
  region: "sa-east-1",
  accessKeyId: "AKIAEXAMPLE",
  secretAccessKey: "segredo",
  fromEmail: "no-reply@deutime.app",
  senderName: "DeuTime",
  configurationSet: "deutime-transactional",
};

describe("adapter AWS SES dos avisos", () => {
  it("aceita configuração completa e mantém ausência como indisponível", () => {
    expect(parseRegistrationEmailSesConfig({ NODE_ENV: "test" })).toBeNull();
    expect(
      parseRegistrationEmailSesConfig({
        NODE_ENV: "test",
        AWS_REGION: "sa-east-1",
        AWS_ACCESS_KEY_ID: "AKIAEXAMPLE",
        AWS_SECRET_ACCESS_KEY: "segredo",
        SES_FROM_EMAIL: "no-reply@deutime.app",
        SES_SENDER_NAME: "DeuTime",
        SES_CONFIGURATION_SET: "deutime-transactional",
      }),
    ).toMatchObject({ region: "sa-east-1", fromEmail: "no-reply@deutime.app" });
  });

  it("falha fechado quando a configuração está parcial", () => {
    expect(() =>
      parseRegistrationEmailSesConfig({ NODE_ENV: "test", AWS_REGION: "sa-east-1" }),
    ).toThrow("Configuração AWS SES");
  });

  it("envia conteúdo com marca, configuração e tag sem PII do atleta", async () => {
    const send = vi.fn(async (command: SendEmailCommand) => ({
      MessageId: command.input ? "ses-message-1" : undefined,
      $metadata: {},
    }));
    const adapter = createRegistrationEmailSesAdapter(
      config,
      new URL("https://deutime.app"),
      { send },
    );

    await expect(
      adapter.send({
        recipient: "admin@example.test",
        teamName: "Avisos FC",
        teamSlug: "avisos-fc",
      }),
    ).resolves.toEqual({ kind: "accepted", providerMessageId: "ses-message-1" });

    const command = send.mock.calls[0]?.[0];
    expect(command?.input).toMatchObject({
      FromEmailAddress: '"DeuTime" <no-reply@deutime.app>',
      Destination: { ToAddresses: ["admin@example.test"] },
      ConfigurationSetName: "deutime-transactional",
      EmailTags: [{ Name: "message_type", Value: "registration_pending" }],
    });
  });

  it("classifica respostas conhecidas e mantém rede incerta fora do retry", () => {
    expect(classifySesFailure({ name: "TooManyRequestsException" })).toEqual({
      kind: "rejected",
      failureClass: "transient",
      errorCode: "ses_toomanyrequestsexception",
    });
    expect(classifySesFailure({ name: "MailFromDomainNotVerifiedException" })).toEqual({
      kind: "rejected",
      failureClass: "permanent",
      errorCode: "ses_mailfromdomainnotverifiedexception",
    });
    expect(classifySesFailure({ name: "TimeoutError" })).toEqual({
      kind: "ambiguous",
      errorCode: "ses_timeouterror",
    });
  });
});
