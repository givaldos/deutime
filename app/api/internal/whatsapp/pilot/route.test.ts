import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumptionEnabled: vi.fn(),
  parseConfig: vi.fn(),
  createRepository: vi.fn(() => ({ claimBatch: vi.fn() })),
  createAdapter: vi.fn(() => ({ send: vi.fn() })),
  runWorker: vi.fn(),
}));

vi.mock("@/lib/env/server", () => ({
  getAppUrl: () => new URL("https://deutime.app"),
}));
vi.mock("@/lib/features/delivery/server", () => ({
  isExternalCommandConsumptionEnabled: mocks.consumptionEnabled,
}));
vi.mock("@/lib/features/delivery/twilio-pilot-config", () => ({
  parseTwilioPilotConfig: mocks.parseConfig,
}));
vi.mock("@/lib/features/delivery/supabase-delivery-repository", () => ({
  createSupabasePilotDeliveryRepository: mocks.createRepository,
}));
vi.mock("@/lib/features/delivery/twilio-adapter", () => ({
  createTwilioWhatsAppAdapter: mocks.createAdapter,
}));
vi.mock("@/lib/features/delivery/whatsapp-worker", () => ({
  runWhatsAppWorker: mocks.runWorker,
}));

import { POST } from "./route";

const secret = "worker-secret-with-at-least-32-characters";
const outboxId = "11111111-1111-4111-8111-111111111111";
const config = {
  accountSid: `AC${"a".repeat(32)}`,
  authToken: "twilio-token-seguro",
  from: "+14155238886",
  pilotTeamId: "22222222-2222-4222-8222-222222222222",
  pilotRecipient: "+5511992362273",
  templates: {
    "event_call:v1": {
      contentSid: `HX${"b".repeat(32)}`,
      profile: "sandbox_appointment",
    },
  },
};

function request(options: {
  token?: string;
  body?: string;
  contentType?: string;
} = {}) {
  return new NextRequest("https://deutime.app/api/internal/whatsapp/pilot", {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.token ?? secret}`,
      "content-type": options.contentType ?? "application/json",
    },
    body: options.body ?? JSON.stringify({ outboxId }),
  });
}

describe("executor controlado do piloto Sandbox", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_WORKER_SECRET;
  });

  it("nega bearer inválido antes de ler configuração ou banco", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    const result = await POST(request({ token: "inválido" }));
    expect(result.status).toBe(401);
    expect(mocks.parseConfig).not.toHaveBeenCalled();
  });

  it("permanece fechado com piloto ou consumo desligado", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.parseConfig.mockReturnValueOnce(null);
    expect((await POST(request())).status).toBe(409);

    mocks.parseConfig.mockReturnValueOnce(config);
    mocks.consumptionEnabled.mockResolvedValueOnce(false);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.runWorker).not.toHaveBeenCalled();
  });

  it("rejeita corpo que não contém somente uma outbox UUID", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.parseConfig.mockReturnValue(config);
    mocks.consumptionEnabled.mockResolvedValue(true);
    expect(
      (await POST(request({ body: JSON.stringify({ outboxId, all: true }) })))
        .status,
    ).toBe(400);
    expect(
      (await POST(request({ contentType: "text/plain" }))).status,
    ).toBe(415);
    expect(mocks.runWorker).not.toHaveBeenCalled();
  });

  it("executa live com lote unitário e allowlist da configuração", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.parseConfig.mockReturnValue(config);
    mocks.consumptionEnabled.mockResolvedValue(true);
    mocks.runWorker.mockResolvedValue({ mode: "live", claimed: 1, accepted: 1 });

    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(mocks.createRepository).toHaveBeenCalledWith({
      teamId: config.pilotTeamId,
      recipient: config.pilotRecipient,
      outboxId,
    });
    expect(mocks.createAdapter).toHaveBeenCalledWith(config);
    expect(mocks.runWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "live",
        batchSize: 1,
        leaseSeconds: 60,
      }),
    );
  });

  it("não expõe detalhes quando configuração ou execução falha", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.parseConfig.mockImplementationOnce(() => {
      throw new Error("token ausente");
    });
    expect(await (await POST(request())).json()).toEqual({
      status: "piloto indisponível",
    });

    mocks.parseConfig.mockReturnValueOnce(config);
    mocks.consumptionEnabled.mockResolvedValueOnce(true);
    mocks.runWorker.mockRejectedValueOnce(new Error("erro Twilio com PII"));
    const result = await POST(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ status: "piloto indisponível" });
  });
});
