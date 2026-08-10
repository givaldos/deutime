import { describe, expect, it, vi } from "vitest";
import type { WhatsAppAdapter } from "./dispatch-contract";
import {
  runWhatsAppWorker,
  type ClaimedNotification,
  type WhatsAppDeliveryRepository,
} from "./whatsapp-worker";

const claim: ClaimedNotification = {
  outboxId: "11111111-1111-4111-8111-111111111111",
  leaseToken: "22222222-2222-4222-8222-222222222222",
  attemptNumber: 1,
};

const prepared = {
  attempt_id: "33333333-3333-4333-8333-333333333333",
  recipient: "+5511999999999",
  event_public_id: "44444444-4444-4444-8444-444444444444",
  credential_secret: "a".repeat(43),
  callback_token: "b".repeat(43),
  template_key: "event_call",
  template_version: "v1",
  template_payload: {
    event_public_id: "44444444-4444-4444-8444-444444444444",
    event_title: "Racha de sexta",
    event_starts_at: "2030-08-02T22:00:00.000Z",
    schedule_version: 1,
  },
};

function repository(
  overrides: Partial<WhatsAppDeliveryRepository> = {},
): WhatsAppDeliveryRepository {
  return {
    produceDueReminders: vi.fn(async () => ({
      contractAvailable: true,
      scannedSlots: 0,
      enqueuedSlots: 0,
      emptySlots: 0,
      skippedSlots: 0,
      enqueuedMessages: 0,
    })),
    recoverExpiredLeases: vi.fn(async () => ({
      safeRetryCount: 0,
      reviewCount: 0,
    })),
    claimBatch: vi.fn(async () => [claim]),
    releaseClaim: vi.fn(async () => true),
    prepare: vi.fn(async () => prepared),
    ack: vi.fn(async () => undefined),
    nack: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("worker WhatsApp", () => {
  it("produz cotas automáticas antes de reivindicar o outbox no modo live", async () => {
    const repo = repository({
      produceDueReminders: vi.fn(async () => ({
        contractAvailable: true,
        scannedSlots: 2,
        enqueuedSlots: 1,
        emptySlots: 1,
        skippedSlots: 1,
        enqueuedMessages: 3,
      })),
      claimBatch: vi.fn(async () => []),
    });
    const adapter: WhatsAppAdapter = { send: vi.fn() };

    const summary = await runWhatsAppWorker({
      mode: "live",
      repository: repo,
      adapter,
      appUrl: new URL("https://deutime.app"),
      produceReminders: true,
    });

    expect(repo.produceDueReminders).toHaveBeenCalledWith(25);
    expect(summary.automatic).toEqual({
      requested: true,
      contractAvailable: true,
      scannedSlots: 2,
      enqueuedSlots: 1,
      emptySlots: 1,
      skippedSlots: 1,
      enqueuedMessages: 3,
    });
  });

  it("não produz automaticamente em dry-run", async () => {
    const repo = repository({ claimBatch: vi.fn(async () => []) });

    const summary = await runWhatsAppWorker({
      mode: "dry-run",
      repository: repo,
      produceReminders: true,
    });

    expect(repo.produceDueReminders).not.toHaveBeenCalled();
    expect(summary.automatic.requested).toBe(false);
  });

  it("dry-run reivindica e libera sem preparar segredo ou chamar adapter", async () => {
    const repo = repository();
    const adapter: WhatsAppAdapter = { send: vi.fn() };

    await expect(
      runWhatsAppWorker({ mode: "dry-run", repository: repo, adapter }),
    ).resolves.toMatchObject({
      mode: "dry-run",
      claimed: 1,
      released: 1,
      prepared: 0,
      accepted: 0,
    });
    expect(repo.prepare).not.toHaveBeenCalled();
    expect(adapter.send).not.toHaveBeenCalled();
  });

  it("modo live prepara, envia e confirma somente o SID aceito", async () => {
    const repo = repository();
    const adapter: WhatsAppAdapter = {
      send: vi.fn(async () => ({
        kind: "accepted" as const,
        providerMessageId: "SM1234567890",
      })),
    };
    const summary = await runWhatsAppWorker({
      mode: "live",
      repository: repo,
      adapter,
      appUrl: new URL("https://deutime.app"),
    });

    expect(summary).toMatchObject({ prepared: 1, accepted: 1 });
    expect(repo.ack).toHaveBeenCalledWith(
      claim,
      prepared.attempt_id,
      "SM1234567890",
    );
  });

  it("rejeição conhecida delega retry ao nack transacional", async () => {
    const repo = repository();
    const adapter: WhatsAppAdapter = {
      send: vi.fn(async () => ({
        kind: "rejected" as const,
        failureClass: "transient" as const,
        errorCode: "twilio_20429",
      })),
    };
    const summary = await runWhatsAppWorker({
      mode: "live",
      repository: repo,
      adapter,
      appUrl: new URL("https://deutime.app"),
    });

    expect(summary.rejected).toBe(1);
    expect(repo.nack).toHaveBeenCalledWith(
      claim,
      prepared.attempt_id,
      "transient",
      "twilio_20429",
    );
  });

  it("resultado incerto nunca volta ao retry automático", async () => {
    const repo = repository();
    const adapter: WhatsAppAdapter = {
      send: vi.fn(async () => ({
        kind: "ambiguous" as const,
        errorCode: "provider_network_unknown",
      })),
    };
    const summary = await runWhatsAppWorker({
      mode: "live",
      repository: repo,
      adapter,
      appUrl: new URL("https://deutime.app"),
    });

    expect(summary.ambiguous).toBe(1);
    expect(repo.nack).toHaveBeenCalledWith(
      claim,
      prepared.attempt_id,
      "ambiguous",
      "provider_network_unknown",
    );
  });

  it("falha incerta no preparo deixa o lease para recuperação no banco", async () => {
    const repo = repository({
      prepare: vi.fn(async () => {
        throw new Error("resposta perdida");
      }),
    });
    const adapter: WhatsAppAdapter = { send: vi.fn() };
    const summary = await runWhatsAppWorker({
      mode: "live",
      repository: repo,
      adapter,
      appUrl: new URL("https://deutime.app"),
    });

    expect(summary.ambiguous).toBe(1);
    expect(repo.releaseClaim).not.toHaveBeenCalled();
    expect(repo.nack).not.toHaveBeenCalled();
    expect(adapter.send).not.toHaveBeenCalled();
  });
});
