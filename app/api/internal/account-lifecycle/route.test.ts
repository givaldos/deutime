import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  remove: vi.fn(),
  deleteUser: vi.fn(),
  createPrivilegedClient: vi.fn(),
}));

vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: mocks.createPrivilegedClient,
}));

import { GET } from "./route";

const secret = "cron-secret-with-at-least-32-characters";
const requestId = "ad100000-0000-4000-8000-000000000001";
const userId = "ad200000-0000-4000-8000-000000000001";

function request(token = secret) {
  return new NextRequest("https://deutime.app/api/internal/account-lifecycle", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("reconciliação de encerramento de conta", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("nega acesso antes de consultar dados", async () => {
    process.env.CRON_SECRET = secret;
    const result = await GET(request("incorreto"));
    expect(result.status).toBe(401);
    expect(mocks.createPrivilegedClient).not.toHaveBeenCalled();
  });

  it("remove arquivo, conclui Auth e executa retenção", async () => {
    process.env.CRON_SECRET = secret;
    mocks.createPrivilegedClient.mockReturnValue({
      rpc: mocks.rpc,
      storage: { from: () => ({ remove: mocks.remove }) },
      auth: { admin: { deleteUser: mocks.deleteUser } },
    });
    mocks.rpc
      .mockResolvedValueOnce({
        data: [{ request_id: requestId, user_id: userId, pending_storage_paths: [`${userId}/profile/foto.webp`] }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { requests: 0 }, error: null });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.deleteUser.mockResolvedValue({ data: { user: {} }, error: null });

    const result = await GET(request());

    expect(result.status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId, true);
    expect(mocks.rpc).toHaveBeenNthCalledWith(3, "complete_account_closure", {
      requested_request_id: requestId,
      requested_error_code: undefined,
    });
    await expect(result.json()).resolves.toMatchObject({
      summary: { claimed: 1, completed: 1, pending: 0 },
    });
  });

  it("mantém bloqueado e registra somente código redigido na falha externa", async () => {
    process.env.CRON_SECRET = secret;
    mocks.createPrivilegedClient.mockReturnValue({
      rpc: mocks.rpc,
      storage: { from: () => ({ remove: mocks.remove }) },
      auth: { admin: { deleteUser: mocks.deleteUser } },
    });
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ request_id: requestId, user_id: userId, pending_storage_paths: [] }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: {}, error: null });
    mocks.deleteUser.mockResolvedValue({ data: { user: null }, error: { code: "Provider PII / falhou" } });

    const result = await GET(request());

    expect(result.status).toBe(200);
    expect(mocks.rpc).toHaveBeenNthCalledWith(3, "complete_account_closure", {
      requested_request_id: requestId,
      requested_error_code: "provider_pii_falhou",
    });
    await expect(result.json()).resolves.toMatchObject({
      summary: { completed: 0, pending: 1 },
    });
  });

  it("falha fechado quando o banco não entrega o lote", async () => {
    process.env.CRON_SECRET = secret;
    mocks.createPrivilegedClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("falha") });
    const result = await GET(request());
    expect(result.status).toBe(503);
  });
});
