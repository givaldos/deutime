import twilio from "twilio";
import { describe, expect, it } from "vitest";
import {
  normalizeTwilioStatusCallback,
  parseCallbackAttemptId,
  parseCallbackToken,
  parseTwilioForm,
  validateTwilioSignature,
} from "./twilio-status-callback";

const authToken = "twilio-auth-token-for-tests";
const token = "x".repeat(43);
const callbackUrl = `https://deutime.app/api/integrations/twilio/whatsapp/status?t=${token}`;

describe("callback de status da Twilio", () => {
  it("valida a assinatura oficial com a URL e todos os campos do formulário", () => {
    const params = parseTwilioForm(
      "MessageSid=SM0123456789abcdef0123456789abcdef&MessageStatus=delivered&FutureField=novo",
    );
    const signature = twilio.getExpectedTwilioSignature(
      authToken,
      callbackUrl,
      params,
    );

    expect(
      validateTwilioSignature({ authToken, signature, callbackUrl, params }),
    ).toBe(true);
    expect(
      validateTwilioSignature({
        authToken,
        signature,
        callbackUrl,
        params: { ...params, FutureField: "alterado" },
      }),
    ).toBe(false);
  });

  it("preserva campos repetidos para a validação da assinatura", () => {
    expect(parseTwilioForm("Campo=b&Campo=a&Campo=a")).toEqual({
      Campo: ["b", "a", "a"],
    });
  });

  it("aceita somente o token opaco como query string", () => {
    expect(parseCallbackToken(new URL(callbackUrl).searchParams)).toBe(token);
    expect(parseCallbackToken(new URL(`${callbackUrl}&debug=1`).searchParams)).toBeNull();
    expect(parseCallbackToken(new URL("https://deutime.app?t=curto").searchParams)).toBeNull();
  });

  it("aceita somente UUID como correlação não secreta da tentativa", () => {
    expect(parseCallbackAttemptId("11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(parseCallbackAttemptId("../segredo")).toBeNull();
  });

  it("normaliza estados e somente códigos de erro seguros", () => {
    expect(
      normalizeTwilioStatusCallback({
        MessageSid: "SM0123456789abcdef0123456789abcdef",
        MessageStatus: "READ",
      }),
    ).toEqual({
      providerMessageId: "SM0123456789abcdef0123456789abcdef",
      deliveryStatus: "read",
      errorCode: null,
    });
    expect(
      normalizeTwilioStatusCallback({
        MessageSid: "SM0123456789abcdef0123456789abcdef",
        MessageStatus: "undelivered",
        ErrorCode: "63016",
      }),
    ).toEqual({
      providerMessageId: "SM0123456789abcdef0123456789abcdef",
      deliveryStatus: "undelivered",
      errorCode: "twilio_63016",
    });
  });

  it("aceita Message SID de mídia retornado pelo WhatsApp", () => {
    const providerMessageId = `MM${"a".repeat(32)}`;
    expect(
      normalizeTwilioStatusCallback({
        MessageSid: providerMessageId,
        MessageStatus: "delivered",
      }),
    ).toEqual({
      providerMessageId,
      deliveryStatus: "delivered",
      errorCode: null,
    });
  });

  it("rejeita SID, status, erro ou campo de negócio repetido inválido", () => {
    expect(normalizeTwilioStatusCallback({ MessageSid: "SM-invalido", MessageStatus: "sent" })).toBeNull();
    expect(
      normalizeTwilioStatusCallback({
        MessageSid: "SM0123456789abcdef0123456789abcdef",
        MessageStatus: "desconhecido",
      }),
    ).toBeNull();
    expect(
      normalizeTwilioStatusCallback({
        MessageSid: "SM0123456789abcdef0123456789abcdef",
        MessageStatus: ["sent", "delivered"],
      }),
    ).toBeNull();
  });
});
