import { describe, expect, it } from "vitest";
import {
  buildWhatsAppDispatchCommand,
  parsePreparedDispatch,
} from "./dispatch-contract";

const prepared = {
  attempt_id: "11111111-1111-4111-8111-111111111111",
  recipient: "+5511999999999",
  event_public_id: "22222222-2222-4222-8222-222222222222",
  credential_secret: "a".repeat(43),
  callback_token: "b".repeat(43),
  template_key: "event_call",
  template_version: "v1",
  template_payload: {
    event_public_id: "22222222-2222-4222-8222-222222222222",
    event_title: "Racha de sexta",
    event_starts_at: "2030-08-02T22:00:00.000Z",
    schedule_version: 3,
  },
};

describe("contrato de dispatch WhatsApp", () => {
  it("valida a saída estrita da RPC de preparo", () => {
    expect(parsePreparedDispatch(prepared)).toEqual(prepared);
    expect(
      parsePreparedDispatch({ ...prepared, recipient: "11999999999" }),
    ).toBeNull();
  });

  it("recusa public_id divergente entre envelope e payload", () => {
    expect(
      parsePreparedDispatch({
        ...prepared,
        template_payload: {
          ...prepared.template_payload,
          event_public_id: "33333333-3333-4333-8333-333333333333",
        },
      }),
    ).toBeNull();
  });

  it("monta link R02 no fragmento e callback pelo ID não secreto da tentativa", () => {
    const parsed = parsePreparedDispatch(prepared)!;
    const command = buildWhatsAppDispatchCommand(
      parsed,
      new URL("https://deutime.app"),
    );

    expect(command.template.variables.event_link).toBe(
      `https://deutime.app/e/${prepared.event_public_id}#c=${prepared.credential_secret}`,
    );
    expect(command.callbackUrl).toBe(
      `https://deutime.app/api/integrations/twilio/whatsapp/status/${prepared.attempt_id}`,
    );
    expect(command.template.variables).not.toHaveProperty("recipient");
  });

  it("propaga o fuso autoritativo quando o banco N já o fornece", () => {
    const parsed = parsePreparedDispatch({
      ...prepared,
      template_payload: {
        ...prepared.template_payload,
        event_timezone: "America/Sao_Paulo",
      },
    })!;
    const command = buildWhatsAppDispatchCommand(
      parsed,
      new URL("https://deutime.app"),
    );

    expect(command.template.variables.event_timezone).toBe(
      "America/Sao_Paulo",
    );
  });
});
