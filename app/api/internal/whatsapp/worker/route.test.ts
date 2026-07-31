import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumptionEnabled: vi.fn(),
  createRepository: vi.fn(() => ({ releaseClaim: vi.fn() })),
  runWorker: vi.fn(),
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
    expect(mocks.runWorker).not.toHaveBeenCalled();
  });

  it("expõe somente dry-run mesmo com consumo habilitado", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.consumptionEnabled.mockResolvedValue(true);
    mocks.runWorker.mockResolvedValue({ mode: "dry-run", claimed: 0 });
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.runWorker).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "dry-run" }),
    );
    await expect(response.json()).resolves.toEqual({
      status: "dry-run concluído",
      summary: { mode: "dry-run", claimed: 0 },
    });
  });
});
