import twilio from "twilio";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/features/delivery/supabase-delivery-repository", () => ({
  recordNotificationCallback: mocks.record,
}));
vi.mock("@/lib/env/server", () => ({
  getAppUrl: () => new URL(process.env.APP_URL ?? "http://localhost:3000"),
}));

import { POST } from "./route";

const authToken = "twilio-auth-token-for-route-tests";
const callbackToken = "x".repeat(43);
const url = `https://deutime.app/api/integrations/twilio/whatsapp/status?t=${callbackToken}`;
const rawBody =
  "MessageSid=SM0123456789abcdef0123456789abcdef&MessageStatus=delivered&FutureField=novo";

function request(options: {
  signature?: string;
  body?: string;
  contentType?: string;
  requestUrl?: string;
} = {}) {
  const body = options.body ?? rawBody;
  return new NextRequest(options.requestUrl ?? url, {
    method: "POST",
    headers: {
      "content-type": options.contentType ?? "application/x-www-form-urlencoded",
      ...(options.signature ? { "x-twilio-signature": options.signature } : {}),
    },
    body,
  });
}

function signature(body = rawBody, callbackUrl = url) {
  return twilio.getExpectedTwilioSignature(
    authToken,
    callbackUrl,
    Object.fromEntries(new URLSearchParams(body)),
  );
}

describe("webhook de status da Twilio", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.APP_URL;
  });

  it("falha fechado sem credencial server-only", async () => {
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("nega assinatura ausente ou inválida antes de acessar o banco", async () => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.APP_URL = "https://deutime.app";
    const response = await POST(request({ signature: "inválida" }));
    expect(response.status).toBe(403);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("valida pela URL canônica, normaliza e delega à RPC estreita", async () => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.APP_URL = "https://deutime.app";
    mocks.record.mockResolvedValue(true);
    const response = await POST(
      request({
        signature: signature(),
        requestUrl: url.replace("deutime.app", "host-nao-confiavel.test"),
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.record).toHaveBeenCalledWith({
      callbackToken,
      providerMessageId: "SM0123456789abcdef0123456789abcdef",
      deliveryStatus: "delivered",
      errorCode: null,
    });
  });

  it("não revela se token opaco assinado é desconhecido", async () => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.APP_URL = "https://deutime.app";
    mocks.record.mockResolvedValue(false);
    expect((await POST(request({ signature: signature() }))).status).toBe(204);
  });

  it("rejeita mídia e corpo acima do limite", async () => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    expect((await POST(request({ contentType: "application/json" }))).status).toBe(415);
    expect(
      (
        await POST(
          request({
            body: `MessageSid=SM0123456789abcdef0123456789abcdef&MessageStatus=sent&pad=${"x".repeat(17_000)}`,
          }),
        )
      ).status,
    ).toBe(413);
  });
});
