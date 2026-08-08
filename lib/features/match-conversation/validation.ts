import { z } from "zod";

const plainText = z
  .string()
  .trim()
  .min(1, "Escreva uma mensagem.")
  .max(1000, "Use no máximo 1.000 caracteres.")
  .refine((value) => !/(https?:\/\/|www\.)/i.test(value), {
    message: "Links não são permitidos.",
  })
  .refine((value) => !/<[^>]+>/.test(value), {
    message: "HTML não é permitido.",
  });

export const createMatchCommentSchema = z.object({
  eventId: z.string().uuid(),
  matchId: z.string().uuid(),
  parentCommentId: z.string().uuid().optional(),
  body: plainText,
  idempotencyKey: z.string().uuid(),
});

export const deleteMatchCommentSchema = z.object({
  eventId: z.string().uuid(),
  commentId: z.string().uuid(),
});

export const reportMatchCommentSchema = z.object({
  eventId: z.string().uuid(),
  commentId: z.string().uuid(),
  reason: z.string().trim().min(2).max(500),
});
