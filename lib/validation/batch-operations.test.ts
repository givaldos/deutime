import { describe, expect, it } from "vitest";
import {
  athleteBatchPreviewRequestSchema,
  BATCH_OPERATION_LIMIT,
  batchPreviewEnvelopeSchema,
  eventBatchPreviewRequestSchema,
} from "./batch-operations";

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

describe("contrato das operações em lote", () => {
  it("aceita seleção explícita limitada e uma alteração uniforme", () => {
    const parsed = eventBatchPreviewRequestSchema.parse({
      teamId: id(1),
      selection: { mode: "explicit", ids: [id(10), id(11)] },
      scope: "selected",
      operation: { action: "shift_time", offsetMinutes: 60 },
    });

    expect(parsed.selection.mode).toBe("explicit");
    expect(parsed.operation.action).toBe("shift_time");
  });

  it("rejeita seleção vazia, repetida ou acima de 50 registros", () => {
    for (const ids of [[], [id(2), id(2)], Array.from({ length: BATCH_OPERATION_LIMIT + 1 }, (_, index) => id(index + 1))]) {
      expect(eventBatchPreviewRequestSchema.safeParse({
        teamId: id(1),
        selection: { mode: "explicit", ids },
        scope: "selected",
        operation: { action: "postpone" },
      }).success).toBe(false);
    }
  });

  it("exige uma única ocorrência explícita para Este e os próximos", () => {
    expect(eventBatchPreviewRequestSchema.safeParse({
      teamId: id(1),
      selection: { mode: "explicit", ids: [id(10), id(11)] },
      scope: "this_and_future",
      operation: { action: "date_tbd" },
    }).success).toBe(false);
  });

  it("distingue deslocar de definir horário civil", () => {
    expect(eventBatchPreviewRequestSchema.safeParse({
      teamId: id(1),
      selection: { mode: "explicit", ids: [id(10)] },
      scope: "selected",
      operation: { action: "shift_time", offsetMinutes: 0 },
    }).success).toBe(false);
    expect(eventBatchPreviewRequestSchema.safeParse({
      teamId: id(1),
      selection: { mode: "explicit", ids: [id(10)] },
      scope: "selected",
      operation: { action: "set_local_time", localTime: "19:00" },
    }).success).toBe(true);
  });

  it("mantém a seleção filtrada de atletas restrita a pendentes", () => {
    expect(athleteBatchPreviewRequestSchema.safeParse({
      teamId: id(1),
      selection: { mode: "filtered", filters: { status: "pending", search: "Ana" } },
      decision: "approve",
    }).success).toBe(true);
    expect(athleteBatchPreviewRequestSchema.safeParse({
      teamId: id(1),
      selection: { mode: "filtered", filters: { status: "active" } },
      decision: "approve",
    }).success).toBe(false);
  });

  it("valida a expiração, o hash e o limite da prévia", () => {
    expect(batchPreviewEnvelopeSchema.safeParse({
      domain: "events",
      action: "postpone",
      scope: "selected",
      previewed_at: "2026-09-29T12:00:00.000Z",
      expires_at: "2026-09-29T12:15:00.000Z",
      selection_hash: "a".repeat(64),
      payload: {},
      item_count: 1,
      blocked_count: 0,
      items: [{ id: id(10) }],
    }).success).toBe(true);
  });
});
