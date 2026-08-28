import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  classifySmtpFailure,
  parseRegistrationEmailSmtpConfig,
} from "./smtp-adapter";

describe("adapter SMTP dos avisos", () => {
  it("aceita configuração completa e mantém ausência como indisponível", () => {
    expect(parseRegistrationEmailSmtpConfig({ NODE_ENV: "test" })).toBeNull();
    expect(
      parseRegistrationEmailSmtpConfig({
        NODE_ENV: "test",
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
        SMTP_USER: "apikey",
        SMTP_PASSWORD: "segredo",
        SMTP_FROM_EMAIL: "no-reply@deutime.app",
        SMTP_SENDER_NAME: "DeuTime",
      }),
    ).toMatchObject({ port: 587, fromEmail: "no-reply@deutime.app" });
  });

  it("falha fechado quando a configuração está parcial", () => {
    expect(() => parseRegistrationEmailSmtpConfig({ NODE_ENV: "test", SMTP_HOST: "smtp" })).toThrow(
      "Configuração SMTP",
    );
  });

  it("classifica respostas conhecidas e mantém rede incerta fora do retry", () => {
    expect(classifySmtpFailure({ responseCode: 421 })).toEqual({
      kind: "rejected",
      failureClass: "transient",
      errorCode: "smtp_421",
    });
    expect(classifySmtpFailure({ responseCode: 550 })).toEqual({
      kind: "rejected",
      failureClass: "permanent",
      errorCode: "smtp_550",
    });
    expect(classifySmtpFailure({ code: "ETIMEDOUT", command: "DATA" })).toEqual({
      kind: "ambiguous",
      errorCode: "smtp_etimedout",
    });
  });
});
