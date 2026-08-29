import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: vi.fn(),
  parseConfig: vi.fn(),
  createAdapter: vi.fn(),
  createRepository: vi.fn(),
  runWorker: vi.fn(),
}));

vi.mock("@/lib/env/server", () => ({ getAppUrl: () => new URL("https://deutime.app") }));
vi.mock("@/lib/features/delivery/server", () => ({
  isRegistrationEmailDeliveryEnabled: mocks.enabled,
}));
vi.mock("@/lib/features/registration-email/ses-adapter", () => ({
  parseRegistrationEmailSesConfig: mocks.parseConfig,
  createRegistrationEmailSesAdapter: mocks.createAdapter,
}));
vi.mock("@/lib/features/registration-email/supabase-repository", () => ({
  createRegistrationEmailRepository: mocks.createRepository,
}));
vi.mock("@/lib/features/registration-email/worker", () => ({
  runRegistrationEmailWorker: mocks.runWorker,
}));

import { GET } from "./route";

const secret = "cron-secret-with-at-least-32-characters";
function request(token = secret) {
  return new NextRequest("https://deutime.app/api/internal/registration-email", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("rota interna de avisos de cadastro", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_WORKER_SECRET;
  });

  it("nega acesso antes de consultar controles", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    const result = await GET(request("incorreto"));
    expect(result.status).toBe(401);
    expect(mocks.enabled).not.toHaveBeenCalled();
  });

  it("respeita kill switch de consumo", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.enabled.mockResolvedValue(false);
    const result = await GET(request());
    expect(result.status).toBe(409);
    expect(mocks.parseConfig).not.toHaveBeenCalled();
  });

  it("falha fechado sem AWS SES completo", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.enabled.mockResolvedValue(true);
    mocks.parseConfig.mockReturnValue(null);
    const result = await GET(request());
    expect(result.status).toBe(503);
  });

  it("executa worker e retorna apenas contagens redigidas", async () => {
    process.env.WHATSAPP_WORKER_SECRET = secret;
    mocks.enabled.mockResolvedValue(true);
    mocks.parseConfig.mockReturnValue({ host: "smtp" });
    mocks.createAdapter.mockReturnValue({ send: vi.fn() });
    mocks.createRepository.mockReturnValue({ claimBatch: vi.fn() });
    mocks.runWorker.mockResolvedValue({ claimed: 2, accepted: 1, ambiguous: 1 });
    const result = await GET(request());
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({
      status: "avisos processados",
      summary: { claimed: 2, accepted: 1, ambiguous: 1 },
    });
  });
});
