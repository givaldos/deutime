import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createPrivilegedClient: vi.fn(),
}));

vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: mocks.createPrivilegedClient,
}));

import { GET } from "./route";

const secret = "cron-secret-with-at-least-32-characters";

function request(token = secret) {
  return new NextRequest("https://deutime.app/api/internal/craque/retention", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("retenção automática do Craque da Galera", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("nega chamada sem bearer válido antes de acessar o banco", async () => {
    process.env.CRON_SECRET = secret;
    const response = await GET(request("incorreto"));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.createPrivilegedClient).not.toHaveBeenCalled();
  });

  it("executa a rotina com service role e lote limitado", async () => {
    process.env.CRON_SECRET = secret;
    mocks.createPrivilegedClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc
      .mockResolvedValueOnce({
        data: { anonymizedVotes: 2, deletedReceipts: 3 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { deletedComments: 4, deletedReports: 1 },
        error: null,
      });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "cleanup_craque_voting_retention",
      { requested_limit: 500 },
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "cleanup_match_conversation_retention",
      { requested_limit: 500 },
    );
    await expect(response.json()).resolves.toEqual({
      status: "retenção executada",
      summary: {
        anonymizedVotes: 2,
        deletedReceipts: 3,
        conversation: { deletedComments: 4, deletedReports: 1 },
      },
    });
  });

  it("mantém o cron compatível enquanto o banco N-1 não possui a conversa", async () => {
    process.env.CRON_SECRET = secret;
    mocks.createPrivilegedClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc
      .mockResolvedValueOnce({
        data: { anonymizedVotes: 0, deletedReceipts: 0 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST202" },
      });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "retenção executada",
      summary: {
        anonymizedVotes: 0,
        deletedReceipts: 0,
        conversation: { status: "contrato pendente" },
      },
    });
  });

  it("falha fechado quando o banco não executa a rotina", async () => {
    process.env.CRON_SECRET = secret;
    mocks.createPrivilegedClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("falha"),
    });

    const response = await GET(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "retenção indisponível",
    });
  });
});
