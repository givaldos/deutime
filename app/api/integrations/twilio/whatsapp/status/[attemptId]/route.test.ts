import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recordByAttemptId: vi.fn() }));
vi.mock("@/lib/features/delivery/supabase-delivery-repository", () => ({
  recordNotificationCallbackByAttemptId: mocks.recordByAttemptId,
}));
vi.mock("@/lib/env/server", () => ({
  getAppUrl: () => new URL(process.env.APP_URL ?? "http://localhost:3000"),
}));

import { POST } from "./route";

const authToken = "twilio-auth-token-for-attempt-route";
const attemptId = "11111111-1111-4111-8111-111111111111";
const url = `https://deutime.app/api/integrations/twilio/whatsapp/status/${attemptId}`;
const rawBody =
  "MessageSid=MM0123456789abcdef0123456789abcdef&MessageStatus=delivered&FutureField=novo";

function request(signature?: string, requestUrl = url) {
  return new NextRequest(requestUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(signature ? { "x-twilio-signature": signature } : {}),
    },
    body: rawBody,
  });
}

const validSignature = "Hzeik/+4eIfTIFi7KZfG/pM8PBY=";

function context(id = attemptId) {
  return { params: Promise.resolve({ attemptId: id }) };
}

describe("webhook Twilio correlacionado pela tentativa", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.APP_URL;
  });

  it("rejeita correlação inválida antes do banco", async () => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    expect((await POST(request(), context("invalido"))).status).toBe(400);
    expect(mocks.recordByAttemptId).not.toHaveBeenCalled();
  });

  it("valida assinatura pela URL canônica e delega sem token secreto", async () => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.APP_URL = "https://deutime.app";
    mocks.recordByAttemptId.mockResolvedValue(true);

    const response = await POST(
      request(validSignature, url.replace("deutime.app", "host-nao-confiavel.test")),
      context(),
    );

    expect(response.status).toBe(204);
    expect(mocks.recordByAttemptId).toHaveBeenCalledWith({
      attemptId,
      providerMessageId: "MM0123456789abcdef0123456789abcdef",
      deliveryStatus: "delivered",
      errorCode: null,
    });
  });

  it("falha fechado quando a assinatura não corresponde", async () => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.APP_URL = "https://deutime.app";
    expect((await POST(request("inválida"), context())).status).toBe(403);
    expect(mocks.recordByAttemptId).not.toHaveBeenCalled();
  });
});
