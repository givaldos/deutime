import { describe, expect, it } from "vitest";
import { parseTwilioPilotConfig } from "./twilio-pilot-config";

const sandboxEnv = {
  WHATSAPP_PILOT_MODE: "sandbox",
  TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "token-sandbox-seguro",
  TWILIO_WHATSAPP_FROM: "+14155238886",
  TWILIO_CONTENT_SID_EVENT_CALL_V1: `HX${"b".repeat(32)}`,
  TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1: `HX${"c".repeat(32)}`,
  TWILIO_TEMPLATE_PROFILE: "sandbox_appointment",
  WHATSAPP_PILOT_TEAM_ID: "11111111-1111-4111-8111-111111111111",
  WHATSAPP_PILOT_RECIPIENT: "+5511992362273",
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

  it("aceita o sender compartilhado com o perfil pré-aprovado do Sandbox", () => {
    expect(parseTwilioPilotConfig(sandboxEnv)).toEqual({
      accountSid: sandboxEnv.TWILIO_ACCOUNT_SID,
      authToken: sandboxEnv.TWILIO_AUTH_TOKEN,
      from: "+14155238886",
      pilotTeamId: sandboxEnv.WHATSAPP_PILOT_TEAM_ID,
      pilotRecipient: sandboxEnv.WHATSAPP_PILOT_RECIPIENT,
      templates: {
        "event_call:v1": {
          contentSid: sandboxEnv.TWILIO_CONTENT_SID_EVENT_CALL_V1,
          profile: "sandbox_appointment",
        },
      },
    });
  });

  it("aceita o template customizado de três variáveis dentro da janela ativa", () => {
    expect(
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_TEMPLATE_PROFILE: "event_call_v1",
      })?.templates["event_call:v1"]?.profile,
    ).toBe("event_call_v1");
  });

  it("seleciona Content SID próprio e versão card_v1 para o card", () => {
    expect(
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_TEMPLATE_PROFILE: "event_call_card_v1",
      })?.templates,
    ).toEqual({
      "event_call:card_v1": {
        contentSid: sandboxEnv.TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1,
        profile: "event_call_card_v1",
      },
    });
  });

  it("exige time e destinatário explícitos para limitar o efeito", () => {
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        WHATSAPP_PILOT_TEAM_ID: "outro-time",
      }),
    ).toThrow("Configuração do piloto Sandbox inválida.");
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        WHATSAPP_PILOT_RECIPIENT: "+5511000000000",
      }),
    ).not.toThrow();
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        WHATSAPP_PILOT_RECIPIENT: "5511992362273",
      }),
    ).toThrow("Configuração do piloto Sandbox inválida.");
  });

  it("falha fechado com sender próprio ou perfil desconhecido", () => {
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_WHATSAPP_FROM: "+5511999999999",
      }),
    ).toThrow("Configuração do piloto Sandbox inválida.");
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_TEMPLATE_PROFILE: "template_desconhecido",
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
    expect(() =>
      parseTwilioPilotConfig({
        ...sandboxEnv,
        TWILIO_TEMPLATE_PROFILE: "event_call_card_v1",
        TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1: undefined,
      }),
    ).toThrow("Configuração do piloto Sandbox inválida.");
  });
});
