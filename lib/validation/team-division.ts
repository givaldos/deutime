import { TEAM_SLUG_PATTERN } from "./onboarding";
import { z } from "zod";

const databaseUuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Identificador inválido.",
  );
const requestUuid = z.string().uuid("Identificador da solicitação inválido.");

export const lineupSquadSchema = z.object({
  id: databaseUuid,
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome para cada time.")
    .max(60, "O nome do time pode ter até 60 caracteres.")
    .refine((name) => !name.startsWith("__r07_"), "Nome reservado."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  sort_order: z.number().int().min(1).max(12),
});

export const lineupAssignmentSchema = z.object({
  athlete_id: databaseUuid,
  squad_id: databaseUuid,
  sort_order: z.number().int().min(1).max(300),
  position_code: z.string().trim().min(1).max(30).nullable().optional(),
  slot_kind: z.enum(["starter", "substitute"]).default("starter"),
});

export const saveEventLineupDraftSchema = z
  .object({
    teamId: databaseUuid,
    teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
    eventId: databaseUuid,
    requestId: requestUuid,
    squads: z.array(lineupSquadSchema).min(2).max(12),
    assignments: z.array(lineupAssignmentSchema).max(300),
    exclusions: z.array(databaseUuid).max(300),
  })
  .superRefine((draft, context) => {
    const squadIds = new Set(draft.squads.map((squad) => squad.id));
    const normalizedNames = draft.squads.map((squad) =>
      squad.name.trim().toLocaleLowerCase("pt-BR"),
    );
    const athleteIds = draft.assignments.map((item) => item.athlete_id);

    if (squadIds.size !== draft.squads.length) {
      context.addIssue({ code: "custom", message: "Há times duplicados." });
    }
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      context.addIssue({ code: "custom", message: "Use nomes diferentes para os times." });
    }
    if (new Set(athleteIds).size !== athleteIds.length) {
      context.addIssue({ code: "custom", message: "Um atleta não pode estar em dois times." });
    }
    if (new Set(draft.exclusions).size !== draft.exclusions.length) {
      context.addIssue({ code: "custom", message: "Há exclusões duplicadas." });
    }
    if (draft.assignments.some((item) => !squadIds.has(item.squad_id))) {
      context.addIssue({ code: "custom", message: "Um atleta aponta para um time removido." });
    }
    const excluded = new Set(draft.exclusions);
    if (draft.assignments.some((item) => excluded.has(item.athlete_id))) {
      context.addIssue({ code: "custom", message: "Um atleta não pode estar escalado e fora." });
    }
  });

export const linkLineupSquadSchema = z.object({
  teamId: databaseUuid,
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  eventId: databaseUuid,
  matchId: databaseUuid,
  sideIndex: z.coerce.number().int().min(1).max(2),
  squadId: databaseUuid,
  requestId: requestUuid,
});

export const eventLineupPublicationSchema = z.object({
  teamId: databaseUuid,
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  eventId: databaseUuid,
  publicId: databaseUuid,
  requestId: requestUuid,
});

export const saveTeamSquadPresetsSchema = z
  .object({
    teamId: databaseUuid,
    teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
    eventId: databaseUuid,
    requestId: requestUuid,
    presets: z.array(lineupSquadSchema).min(2).max(12),
  })
  .superRefine((input, context) => {
    const ids = new Set(input.presets.map((preset) => preset.id));
    const names = new Set(
      input.presets.map((preset) => preset.name.trim().toLocaleLowerCase("pt-BR")),
    );
    const orders = new Set(input.presets.map((preset) => preset.sort_order));
    if (
      ids.size !== input.presets.length ||
      names.size !== input.presets.length ||
      orders.size !== input.presets.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Use modelos diferentes e ordenados.",
      });
    }
  });

export type SaveEventLineupDraftInput = z.infer<
  typeof saveEventLineupDraftSchema
>;
