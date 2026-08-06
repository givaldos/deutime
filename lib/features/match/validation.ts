import { z } from "zod";

export const createMatchSchema = z.object({
  eventId: z.string().uuid(),
  teamSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/),
  ordinal: z.coerce.number().int().min(1).max(32).optional(),
  sideALabel: z.string().trim().min(1).max(60).optional(),
  sideBLabel: z.string().trim().min(1).max(60).optional(),
  externalOpponentName: z.string().trim().max(80).optional(),
});

export const matchParticipationSchema = z.object({
  matchId: z.string().uuid(),
  teamSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/),
  athleteId: z.string().uuid(),
  sideIndex: z.coerce.number().int().min(1).max(2),
});

export const matchEventSchema = z.object({
  matchId: z.string().uuid(),
  teamSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/),
  kind: z.enum(["goal","own_goal","yellow_card","red_card","substitution","score_adjustment","note"]),
  sideIndex: z.coerce.number().int().min(1).max(2).optional(),
  athleteId: z.string().uuid().optional(),
  assistAthleteId: z.string().uuid().optional(),
  minute: z.coerce.number().int().min(0).max(300).optional(),
  delta: z.coerce.number().int().min(-99).max(99).optional(),
  notes: z.string().trim().max(500).optional(),
}).superRefine((v, ctx) => {
  if ((v.kind === "goal" || v.kind === "own_goal") && !v.sideIndex) ctx.addIssue({ code:"custom", message:"Lado obrigatório para gol", path:["sideIndex"] });
  if (v.kind === "score_adjustment" && v.delta === undefined) ctx.addIssue({ code:"custom", message:"Delta obrigatório para ajuste", path:["delta"] });
  if (v.kind !== "score_adjustment" && v.delta !== undefined) ctx.addIssue({ code:"custom", message:"Delta só para ajuste", path:["delta"] });
  if (v.assistAthleteId && v.athleteId && v.assistAthleteId === v.athleteId) ctx.addIssue({ code:"custom", message:"Atleta e assistência devem diferir", path:["assistAthleteId"] });
});
