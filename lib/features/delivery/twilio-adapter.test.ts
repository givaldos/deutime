import { describe, expect, it, vi } from "vitest";
import type { WhatsAppDispatchCommand } from "./dispatch-contract";
import { createTwilioWhatsAppAdapter } from "./twilio-adapter";

const command: WhatsAppDispatchCommand = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  recipient: "+5511999999999",
  template: {
    key: "event_call",
    version: "v1",
    variables: {
      event_title: "Racha de sexta",
      event_starts_at: "2030-08-02T22:00:00.000Z",
      event_link: "https://deutime.app/e/example#c=secret",
    },
  },
  callbackUrl: "https://deutime.app/api/status?t=opaque",
};

const config = {
  accountSid: "AC1234567890",
  authToken: "token-com-tamanho-seguro",
  from: "+14155238886",
  templates: {
    "event_call:v1": {
      contentSid: "HX0123456789abcdef0123456789abcdef",
      profile: "event_call_v1" as const,
    },
  },
};

describe("adapter Twilio", () => {
  it("traduz o comando interno para Content API e retorna o SID", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ sid: "SM1234567890" }, { status: 201 }),
    );
    const adapter = createTwilioWhatsAppAdapter(
      config,
      fetchImpl as typeof fetch,
    );

    await expect(adapter.send(command)).resolves.toEqual({
      kind: "accepted",
      providerMessageId: "SM1234567890",
    });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = init?.body as URLSearchParams;
    expect(body.get("To")).toBe("whatsapp:+5511999999999");
    expect(body.get("From")).toBe("whatsapp:+14155238886");
    expect(body.get("ContentSid")).toBe(
      "HX0123456789abcdef0123456789abcdef",
    );
    expect(body.get("StatusCallback")).toBe(command.callbackUrl);
    expect(JSON.parse(body.get("ContentVariables")!)).toEqual({
      "1": "Racha de sexta",
      "2": "2030-08-02T22:00:00.000Z",
      "3": "https://deutime.app/e/example#c=secret",
    });
  });

  it("classifica 429 como rejeição transitória conhecida", async () => {
    const adapter = createTwilioWhatsAppAdapter(
      config,
      vi.fn(async () => Response.json({ code: 20429 }, { status: 429 })) as
        typeof fetch,
    );
    await expect(adapter.send(command)).resolves.toEqual({
      kind: "rejected",
      failureClass: "transient",
      errorCode: "twilio_20429",
    });
  });

  it("classifica 4xx definitivo sem persistir a mensagem do provedor", async () => {
    const adapter = createTwilioWhatsAppAdapter(
      config,
      vi.fn(async () =>
        Response.json(
          { code: 21610, message: "recipient opted out" },
          { status: 400 },
        ),
      ) as typeof fetch,
    );
    await expect(adapter.send(command)).resolves.toEqual({
      kind: "rejected",
      failureClass: "permanent",
      errorCode: "twilio_21610",
    });
  });

  it("trata queda de rede e resposta aceita sem SID como ambíguas", async () => {
    const networkAdapter = createTwilioWhatsAppAdapter(
      config,
      vi.fn(async () => {
        throw new Error("socket closed");
      }) as typeof fetch,
    );
    await expect(networkAdapter.send(command)).resolves.toEqual({
      kind: "ambiguous",
      errorCode: "provider_network_unknown",
    });

    const invalidAdapter = createTwilioWhatsAppAdapter(
      config,
      vi.fn(async () => Response.json({}, { status: 201 })) as typeof fetch,
    );
    await expect(invalidAdapter.send(command)).resolves.toEqual({
      kind: "ambiguous",
      errorCode: "provider_response_invalid",
    });
  });

  it("falha fechado quando o template não está configurado", async () => {
    const adapter = createTwilioWhatsAppAdapter(
      { ...config, templates: {} },
      vi.fn() as typeof fetch,
    );
    await expect(adapter.send(command)).resolves.toEqual({
      kind: "rejected",
      failureClass: "permanent",
      errorCode: "template_not_configured",
    });
  });

  it("usa somente as duas variáveis do template pré-aprovado no Sandbox", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ sid: "SM1234567890" }, { status: 201 }),
    );
    const adapter = createTwilioWhatsAppAdapter(
      {
        ...config,
        templates: {
          "event_call:v1": {
            ...config.templates["event_call:v1"],
            profile: "sandbox_appointment",
          },
        },
      },
      fetchImpl as typeof fetch,
    );
    await adapter.send(command);

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const variables = JSON.parse(
      (init.body as URLSearchParams).get("ContentVariables")!,
    );
    expect(variables).toEqual({
      "1": "Racha de sexta em 2030-08-02T22:00:00.000Z",
      "2": "https://deutime.app/e/example#c=secret",
    });
    expect(variables).not.toHaveProperty("3");
  });
});
