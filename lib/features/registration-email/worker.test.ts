import { describe, expect, it, vi } from "vitest";
import type { RegistrationEmailAdapter } from "./contract";
import {
  runRegistrationEmailWorker,
  type RegistrationEmailRepository,
} from "./worker";

const claim = {
  outboxId: "11111111-1111-4111-8111-111111111111",
  leaseToken: "22222222-2222-4222-8222-222222222222",
  attemptNumber: 1,
};
const prepared = {
  attemptId: "33333333-3333-4333-8333-333333333333",
  recipient: "admin@example.test",
  teamName: "Avisos FC",
  teamSlug: "avisos-fc",
};

function repository(
  overrides: Partial<RegistrationEmailRepository> = {},
): RegistrationEmailRepository {
  return {
    recoverExpiredLeases: vi.fn(async () => ({ safeRetryCount: 0, reviewCount: 0 })),
    claimBatch: vi.fn(async () => [claim]),
    prepare: vi.fn(async () => prepared),
    ack: vi.fn(async () => true),
    nack: vi.fn(async () => "failed"),
    ...overrides,
  };
}

describe("worker de aviso de cadastro", () => {
  it("confirma uma aceitação do SES usando somente o id do provedor", async () => {
    const repo = repository();
    const adapter: RegistrationEmailAdapter = {
      send: vi.fn(async () => ({ kind: "accepted" as const, providerMessageId: "msg-1" })),
    };
    await expect(runRegistrationEmailWorker({ repository: repo, adapter })).resolves.toMatchObject({
      claimed: 1,
      accepted: 1,
    });
    expect(repo.ack).toHaveBeenCalledWith(claim, prepared.attemptId, "msg-1");
  });

  it("delega rejeição conhecida ao retry transacional", async () => {
    const repo = repository();
    const adapter: RegistrationEmailAdapter = {
      send: vi.fn(async () => ({
        kind: "rejected" as const,
        failureClass: "transient" as const,
        errorCode: "smtp_421",
      })),
    };
    await expect(runRegistrationEmailWorker({ repository: repo, adapter })).resolves.toMatchObject({ transient: 1 });
    expect(repo.nack).toHaveBeenCalledWith(claim, prepared.attemptId, "transient", "smtp_421");
  });

  it("manda resultado incerto para revisão e nunca confirma", async () => {
    const repo = repository();
    const adapter: RegistrationEmailAdapter = {
      send: vi.fn(async () => ({ kind: "ambiguous" as const, errorCode: "smtp_network_unknown" })),
    };
    await expect(runRegistrationEmailWorker({ repository: repo, adapter })).resolves.toMatchObject({ ambiguous: 1 });
    expect(repo.nack).toHaveBeenCalledWith(claim, prepared.attemptId, "ambiguous", "smtp_network_unknown");
    expect(repo.ack).not.toHaveBeenCalled();
  });

  it("não envia quando o banco recalcula destinatário como inelegível", async () => {
    const repo = repository({ prepare: vi.fn(async () => null) });
    const adapter: RegistrationEmailAdapter = { send: vi.fn() };
    await expect(runRegistrationEmailWorker({ repository: repo, adapter })).resolves.toMatchObject({ skipped: 1 });
    expect(adapter.send).not.toHaveBeenCalled();
  });

  it("recupera leases antes de reivindicar o próximo lote", async () => {
    const repo = repository({
      recoverExpiredLeases: vi.fn(async () => ({ safeRetryCount: 2, reviewCount: 1 })),
      claimBatch: vi.fn(async () => []),
    });
    const adapter: RegistrationEmailAdapter = { send: vi.fn() };
    await expect(runRegistrationEmailWorker({ repository: repo, adapter })).resolves.toMatchObject({
      recovered: 2,
      review: 1,
      claimed: 0,
    });
    expect(repo.recoverExpiredLeases).toHaveBeenCalledBefore(repo.claimBatch as ReturnType<typeof vi.fn>);
  });
});
