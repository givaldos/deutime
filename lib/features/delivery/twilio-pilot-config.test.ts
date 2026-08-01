import { describe, expect, it } from "vitest";
import { parseTwilioPilotConfig } from "./twilio-pilot-config";

const sandboxEnv = {
  WHATSAPP_PILOT_MODE: "sandbox",
  TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "token-sandbox-seguro",
  TWILIO_WHATSAPP_FROM: "+14155238886",
  TWILIO_CONTENT_SID_EVENT_CALL_V1: `HX${"b".repeat(32)}`,
  TWILIO_TEMPLATE_PROFILE: "sandbox_appointment",
};

describe("configuração do piloto Twilio", () => {
  it("permanece inerte por padrão mesmo se houver credenciais", () => {
    expect(
      parseTwilioPilotConfig({
        ...sandboxEnv,
        WHATSAPP_PILOT_MODE: "off",
      }),
    ).toBeNull();
  });

  it("aceita somente o sender e o perfil pré-aprovado do Sandbox", () => {
    expect(parseTwilioPilotConfig(sandboxEnv)).toEqual({
      accountSid: sandboxEnv.TWILIO_ACCOUNT_SID,
      authToken: sandboxEnv.TWILIO_AUTH_TOKEN,
      from: "+14155238886",
      templates: {
        "event_call:v1": {
          contentSid: sandboxEnv.TWILIO_CONTENT_SID_EVENT_CALL_V1,
          profile: "sandbox_appointment",
        },
      },
    });
  });

  it("falha fechado com sender próprio ou perfil customizado nesta fase", () => {
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_WHATSAPP_FROM: "+5511999999999",
      }),
    ).toThrow("Configuração do piloto Sandbox inválida.");
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_TEMPLATE_PROFILE: "event_call_v1",
      }),
    ).toThrow("Configuração do piloto Sandbox inválida.");
  });

  it("não aceita SID curto ou ausente quando o piloto está selecionado", () => {
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_CONTENT_SID_EVENT_CALL_V1: "HXcurto",
      }),
    ).toThrow("Configuração do piloto Sandbox inválida.");
  });
});
