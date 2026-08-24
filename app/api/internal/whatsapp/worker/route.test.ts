import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumptionEnabled: vi.fn(),
  createRepository: vi.fn(() => ({ releaseClaim: vi.fn() })),
  runWorker: vi.fn(),
  parseProductionConfig: vi.fn(),
  createAdapter: vi.fn(),
  getAppUrl: vi.fn(() => new URL("https://deutime.app")),
}));

vi.mock("@/lib/features/delivery/server", () => ({
  isExternalCommandConsumptionEnabled: mocks.consumptionEnabled,
}));
vi.mock("@/lib/features/delivery/supabase-delivery-repository", () => ({
  createSupabaseDeliveryRepository: mocks.createRepository,
}));
vi.mock("@/lib/features/delivery/whatsapp-worker", () => ({
  runWhatsAppWorker: mocks.runWorker,
}));
vi.mock("@/lib/features/delivery/twilio-pilot-config", () => ({
  parseTwilioProductionConfig: mocks.parseProductionConfig,
}));
vi.mock("@/lib/features/delivery/twilio-adapter", () => ({
  createTwilioWhatsAppAdapter: mocks.createAdapter,
}));
vi.mock("@/lib/env/server", () => ({
  getAppUrl: mocks.getAppUrl,
}));

import { POST } from "./route";

const secret = "worker-secret-with-at-least-32-characters";

function request(token = secret) {
  return new NextRequest("https://deutime.app/api/internal/whatsapp/worker", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("executor interno do WhatsApp", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_WORKER_SECRET;
  });

  it("nega chamada sem bearer válido antes de consultar infraestrutura", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    const response = await POST(request("incorreto"));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(mocks.consumptionEnabled).not.toHaveBeenCalled();
  });

  it("falha fechado enquanto o kill switch de consumo está desligado", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.consumptionEnabled.mockResolvedValue(false);
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.consumptionEnabled).toHaveBeenCalledWith(3_000);
    expect(mocks.runWorker).not.toHaveBeenCalled();
  });

  it("usa dry-run quando não há credenciais Twilio configuradas", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.consumptionEnabled.mockResolvedValue(true);
    mocks.parseProductionConfig.mockReturnValue(null);
    mocks.runWorker.mockResolvedValue({ mode: "dry-run", claimed: 0 });
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.runWorker).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "dry-run" }),
    );
    await expect(response.json()).resolves.toEqual({
      status: "dry-run concluído",
      reminderTemplates: "indisponíveis",
      summary: { mode: "dry-run", claimed: 0 },
    });
  });

  it("usa live quando as credenciais Twilio estão configuradas", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.consumptionEnabled.mockResolvedValue(true);
    const fakeConfig = {
      accountSid: "AC123",
      templates: {
        "event_reminder:first_card_v2": { contentSid: "HX1" },
        "event_reminder:last_card_v2": { contentSid: "HX2" },
      },
    };
    mocks.parseProductionConfig.mockReturnValue(fakeConfig);
    const fakeAdapter = { send: vi.fn() };
    mocks.createAdapter.mockReturnValue(fakeAdapter);
    mocks.runWorker.mockResolvedValue({ mode: "live", claimed: 1, accepted: 1 });
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.runWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "live",
        adapter: fakeAdapter,
        produceReminders: true,
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      status: "worker executado",
      reminderTemplates: "prontos",
    });
  });

  it("mantém produção automática inerte se faltar um dos templates", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.consumptionEnabled.mockResolvedValue(true);
    mocks.parseProductionConfig.mockReturnValue({
      accountSid: "AC123",
      templates: {
        "event_reminder:first_card_v2": { contentSid: "HX1" },
      },
    });
    mocks.createAdapter.mockReturnValue({ send: vi.fn() });
    mocks.runWorker.mockResolvedValue({ mode: "live", claimed: 0 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.runWorker).toHaveBeenCalledWith(
      expect.objectContaining({ produceReminders: false }),
    );
    await expect(response.json()).resolves.toMatchObject({
      reminderTemplates: "indisponíveis",
    });
  });

  it("retorna 503 se a configuração Twilio for inválida", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.consumptionEnabled.mockResolvedValue(true);
    mocks.parseProductionConfig.mockImplementation(() => {
      throw new Error("Configuração Twilio de produção inválida.");
    });
    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.runWorker).not.toHaveBeenCalled();
  });
});
