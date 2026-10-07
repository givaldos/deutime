import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));

import { lookupBatchCommand } from "./batch-actions";

const teamId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";

describe("consulta de confirmação em lote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "staff" });
  });

  it("valida os identificadores antes de consultar", async () => {
    expect(await lookupBatchCommand({ teamId, requestId: "invalido", domain: "events" })).toEqual({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("retorna somente quantidade aplicada após autenticar", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "applied", applied_count: 2, private_data: "não expor" }, error: null });
    expect(await lookupBatchCommand({ teamId, requestId, domain: "athletes" })).toEqual({ status: "applied", appliedCount: 2 });
    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("get_batch_command_result", {
      requested_team_id: teamId,
      requested_domain: "athletes",
      requested_request_id: requestId,
    });
  });

  it("aceita identificador legado do time", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "applied", applied_count: 1 }, error: null });
    expect(await lookupBatchCommand({
      teamId: "10000000-0000-0000-0000-000000000001", requestId, domain: "events",
    })).toEqual({ status: "applied", appliedCount: 1 });
  });

  it("não afirma aplicação sem resultado registrado", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "unknown" }, error: null });
    expect(await lookupBatchCommand({ teamId, requestId, domain: "events" })).toEqual({ status: "unknown" });
  });
});
