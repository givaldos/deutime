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

export const championshipFormat = z.enum([
  "league",
  "groups_knockout",
  "knockout",
]);

export const createChampionshipSchema = z
  .object({
    teamId: uuid,
    teamSlug,
    requestId: uuid,
    name: z.string().trim().min(2, "Dê um nome ao campeonato.").max(120),
    format: championshipFormat,
    winPoints: z.coerce.number().int().min(0).max(10),
    drawPoints: z.coerce.number().int().min(0).max(10),
    lossPoints: z.coerce.number().int().min(0).max(10),
    groupCount: z.coerce.number().int().min(2).max(8).optional(),
    qualifiersPerGroup: z.coerce.number().int().min(1).max(2).optional(),
    tiebreakOrder: z
      .array(z.enum(championshipTiebreakKeys))
      .min(1)
      .max(4)
      .refine((items) => new Set(items).size === items.length, {
        message: "Não repita um critério de desempate.",
      }),
  })
  .superRefine((value, context) => {
    if (value.format === "groups_knockout") {
      if (!value.groupCount) {
        context.addIssue({
          code: "custom",
          path: ["groupCount"],
          message: "Informe a quantidade de grupos.",
        });
      }
      if (!value.qualifiersPerGroup) {
        context.addIssue({
          code: "custom",
          path: ["qualifiersPerGroup"],
          message: "Informe quantos avançam por grupo.",
        });
      }
    }
  });

export const addChampionshipParticipantSchema = z
  .object({
    teamId: uuid,
    teamSlug,
    championshipId: uuid,
    requestId: uuid,
    seed: z.coerce.number().int().min(1).max(32),
    groupNumber: z.coerce.number().int().min(1).max(8).optional(),
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

export const championshipFormatCommandSchema = championshipCommandSchema.extend({
  format: championshipFormat,
});

export const championshipPublicModeSchema = championshipCommandSchema.extend({
  publicId: uuid,
  mode: z.enum(["private", "public"]),
});

export const linkChampionshipFixtureSchema = championshipCommandSchema.extend({
  fixtureId: uuid,
  matchId: uuid,
});

export const releaseChampionshipFixtureSchema = championshipCommandSchema.extend({
  fixtureId: uuid,
  reason: z.string().trim().min(3, "Explique por que a partida será remarcada.").max(500),
});

export const withdrawChampionshipParticipantSchema = championshipCommandSchema.extend({
  participantId: uuid,
  reason: z.string().trim().min(3, "Explique a retirada do participante.").max(500),
});

export const decideChampionshipQualifierSchema = championshipCommandSchema.extend({
  groupNumber: z.coerce.number().int().min(1).max(8),
  qualifierPosition: z.coerce.number().int().min(1).max(2),
  participantId: uuid,
  reason: z.string().trim().min(3, "Explique a decisão da vaga.").max(500),
});

export const resolveChampionshipFixtureSchema = championshipCommandSchema
  .extend({
    fixtureId: uuid,
    winnerId: z.string().optional().transform((value) => value || null),
    resolution: z.enum([
      "score",
      "penalties",
      "walkover",
      "regulation",
      "administrative",
    ]),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.resolution === "score") return;
    if (!value.winnerId || !uuid.safeParse(value.winnerId).success) {
      context.addIssue({
        code: "custom",
        path: ["winnerId"],
        message: "Escolha quem avança.",
      });
    }
    if (!value.reason || value.reason.length < 3) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Explique a decisão eliminatória.",
      });
    }
  });
