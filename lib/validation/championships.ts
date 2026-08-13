import { championshipTiebreakKeys } from "@/lib/features/championships/rules";
import { z } from "zod";

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Identificador inválido.",
);
const teamSlug = z.string().trim().min(1).max(80);
const badgeKey = z.enum([
  "shield",
  "stripes",
  "sash",
  "quarters",
  "circle",
  "diamond",
]);

export const createChampionshipSchema = z.object({
  teamId: uuid,
  teamSlug,
  requestId: uuid,
  name: z.string().trim().min(2, "Dê um nome ao campeonato.").max(120),
  winPoints: z.coerce.number().int().min(0).max(10),
  drawPoints: z.coerce.number().int().min(0).max(10),
  lossPoints: z.coerce.number().int().min(0).max(10),
  tiebreakOrder: z
    .array(z.enum(championshipTiebreakKeys))
    .min(1)
    .max(4)
    .refine((items) => new Set(items).size === items.length, {
      message: "Não repita um critério de desempate.",
    }),
});

export const addChampionshipParticipantSchema = z
  .object({
    teamId: uuid,
    teamSlug,
    championshipId: uuid,
    requestId: uuid,
    seed: z.coerce.number().int().min(1).max(32),
    kind: z.enum(["internal", "external"]),
    internalTeamId: z.string().optional().transform((value) => value || null),
    externalName: z.string().trim().max(80).optional(),
    externalColor: z.string().trim().optional(),
    externalBadgeKey: badgeKey.optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === "internal") {
      if (!value.internalTeamId || !uuid.safeParse(value.internalTeamId).success) {
        context.addIssue({
          code: "custom",
          path: ["internalTeamId"],
          message: "Escolha uma equipe interna.",
        });
      }
      return;
    }
    if (!value.externalName || value.externalName.length < 1) {
      context.addIssue({
        code: "custom",
        path: ["externalName"],
        message: "Informe o nome do adversário.",
      });
    }
    if (!value.externalColor?.match(/^#[0-9A-Fa-f]{6}$/)) {
      context.addIssue({
        code: "custom",
        path: ["externalColor"],
        message: "Escolha uma cor válida.",
      });
    }
    if (!value.externalBadgeKey) {
      context.addIssue({
        code: "custom",
        path: ["externalBadgeKey"],
        message: "Escolha um escudo.",
      });
    }
  });

export const championshipCommandSchema = z.object({
  teamId: uuid,
  teamSlug,
  championshipId: uuid,
  requestId: uuid,
});

export const linkChampionshipFixtureSchema = championshipCommandSchema.extend({
  fixtureId: uuid,
  matchId: uuid,
});
