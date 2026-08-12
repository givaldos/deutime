import { describe, expect, it, vi } from "vitest";
import {
  canConsumeExternalCommands,
  canProduceExternalCommands,
  failClosedLookup,
  featureKeys,
} from "./capabilities";

describe("controles de entrega", () => {
  it("mantém capacidade nova desligada quando não há configuração", async () => {
    await expect(
      failClosedLookup("persistent_event_access", async () => false),
    ).resolves.toBe(false);
  });

  it("falha fechada quando a consulta dá erro", async () => {
    await expect(
      canProduceExternalCommands(async () => {
        throw new Error("indisponível");
      }),
    ).resolves.toBe(false);
  });

  it("falha fechada no timeout sem bloquear o fluxo legado", async () => {
    vi.useFakeTimers();
    const result = canConsumeExternalCommands(
      () => new Promise(() => undefined),
      25,
    );
    await vi.advanceTimersByTimeAsync(25);
    await expect(result).resolves.toBe(false);
    vi.useRealTimers();
  });

  it("mantém produção e consumo independentes", async () => {
    const lookup = async (key: string) => key === "integration_produce";
    await expect(canProduceExternalCommands(lookup)).resolves.toBe(true);
    await expect(canConsumeExternalCommands(lookup)).resolves.toBe(false);
  });

  it("reconhece as flags independentes da confirmação por link", () => {
    expect(featureKeys).toEqual(
      expect.arrayContaining([
        "public_event_page",
        "event_capability_exchange",
        "event_capability_rsvp",
        "event_share_card",
      ]),
    );
  });
});
