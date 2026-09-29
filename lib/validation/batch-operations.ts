import { z } from "zod";

export const BATCH_OPERATION_LIMIT = 50;
export const BATCH_PREVIEW_TTL_MINUTES = 15;

const databaseUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Identificador inválido.",
);

const explicitIds = z.array(databaseUuid)
  .min(1, "Selecione pelo menos um registro.")
  .max(BATCH_OPERATION_LIMIT, `Selecione no máximo ${BATCH_OPERATION_LIMIT} registros.`)
  .refine((ids) => new Set(ids).size === ids.length, "A seleção contém registros repetidos.");

const dateFilter = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const eventBatchSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("explicit"), ids: explicitIds }),
  z.object({
    mode: z.literal("filtered"),
    filters: z.object({
      search: z.string().trim().min(2).max(80).optional(),
      kind: z.enum(["training", "friendly", "championship", "other"]).optional(),
      internalTeamId: databaseUuid.optional(),
      championshipId: databaseUuid.optional(),
      periodStart: dateFilter.optional(),
      periodEnd: dateFilter.optional(),
    }).refine(
      ({ periodStart, periodEnd }) => !periodStart || !periodEnd || periodStart <= periodEnd,
      "O período da seleção é inválido.",
    ),
  }),
]);

export const athleteBatchSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("explicit"), ids: explicitIds }),
  z.object({
    mode: z.literal("filtered"),
    filters: z.object({
      search: z.string().trim().min(2).max(80).optional(),
      status: z.literal("pending"),
      positionCode: z.string().regex(/^[A-Z_]{1,16}$/).optional(),
    }),
  }),
]);

export const eventBatchActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("shift_time"),
    offsetMinutes: z.number().int().min(-10_080).max(10_080).refine(Boolean),
  }),
  z.object({
    action: z.literal("set_local_time"),
    localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  }),
  z.object({ action: z.literal("set_venue"), venueId: databaseUuid }),
  z.object({ action: z.literal("set_duration"), durationMinutes: z.number().int().min(15).max(480) }),
  z.object({ action: z.literal("postpone") }),
  z.object({ action: z.literal("date_tbd") }),
  z.object({ action: z.literal("cancel") }),
]);

export const eventBatchPreviewRequestSchema = z.object({
  teamId: databaseUuid,
  selection: eventBatchSelectionSchema,
  scope: z.enum(["selected", "this_and_future"]),
  operation: eventBatchActionSchema,
}).superRefine(({ selection, scope }, context) => {
  if (scope === "this_and_future" && (selection.mode !== "explicit" || selection.ids.length !== 1)) {
    context.addIssue({
      code: "custom",
      path: ["scope"],
      message: "Este e os próximos exige uma única ocorrência de uma série.",
    });
  }
});

export const athleteBatchPreviewRequestSchema = z.object({
  teamId: databaseUuid,
  selection: athleteBatchSelectionSchema,
  decision: z.enum(["approve", "reject"]),
});

export const batchPreviewEnvelopeSchema = z.object({
  domain: z.enum(["events", "athletes"]),
  action: z.string().min(1).max(40),
  scope: z.enum(["selected", "this_and_future"]),
  previewed_at: z.iso.datetime({ offset: true }),
  expires_at: z.iso.datetime({ offset: true }),
  selection_hash: z.string().regex(/^[0-9a-f]{64}$/),
  item_count: z.number().int().min(1).max(BATCH_OPERATION_LIMIT),
  blocked_count: z.number().int().min(0).max(BATCH_OPERATION_LIMIT),
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(BATCH_OPERATION_LIMIT),
});

export const batchApplyRequestSchema = z.object({
  teamId: databaseUuid,
  requestId: databaseUuid,
  preview: batchPreviewEnvelopeSchema,
});

export type EventBatchPreviewRequest = z.infer<typeof eventBatchPreviewRequestSchema>;
export type AthleteBatchPreviewRequest = z.infer<typeof athleteBatchPreviewRequestSchema>;
export type BatchPreviewEnvelope = z.infer<typeof batchPreviewEnvelopeSchema>;
