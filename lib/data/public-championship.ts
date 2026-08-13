import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { z } from "zod";

const publicChampionshipId = z.string().uuid();
const badgeKey = z.enum([
  "shield",
  "stripes",
  "sash",
  "quarters",
  "circle",
  "diamond",
]);

const publicParticipantSchema = z.object({
  seed: z.number().int().min(1).max(32),
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  badge_key: badgeKey,
  group_number: z.number().int().min(1).max(8).nullable(),
  status: z.enum(["active", "withdrawn"]),
}).strict();

const fixtureSideSchema = publicParticipantSchema.pick({
  seed: true,
  name: true,
  color: true,
  badge_key: true,
}).strict();

const publicStandingSchema = fixtureSideSchema.extend({
  group_number: z.number().int().min(1).max(8).nullable(),
  rank_position: z.number().int().positive(),
  played: z.number().int().min(0),
  wins: z.number().int().min(0),
  draws: z.number().int().min(0),
  losses: z.number().int().min(0),
  goals_for: z.number().int().min(0),
  goals_against: z.number().int().min(0),
  goal_difference: z.number().int(),
  points: z.number().int(),
}).strict();

const publicFixtureSchema = z.object({
  stage: z.enum(["league", "group", "knockout"]),
  status: z.enum(["draft", "scheduled", "finalized", "void"]),
  group_number: z.number().int().min(1).max(8).nullable(),
  round_number: z.number().int().min(1).max(32),
  ordinal: z.number().int().min(1).max(512),
  side_one_kind: z.enum(["participant", "winner", "loser", "bye"]),
  side_two_kind: z.enum(["participant", "winner", "loser", "bye"]),
  side_one: fixtureSideSchema.nullable(),
  side_two: fixtureSideSchema.nullable(),
  winner_seed: z.number().int().min(1).max(32).nullable(),
  resolution: z.enum([
    "score",
    "penalties",
    "walkover",
    "regulation",
    "administrative",
  ]).nullable(),
  score_one: z.number().int().min(0).nullable(),
  score_two: z.number().int().min(0).nullable(),
  event_public_id: z.string().uuid().nullable(),
}).strict().superRefine((fixture, context) => {
  if ((fixture.score_one === null) !== (fixture.score_two === null)) {
    context.addIssue({ code: "custom", message: "Placar público incompleto" });
  }
  if (fixture.event_public_id !== null && fixture.score_one === null) {
    context.addIssue({ code: "custom", message: "Link público sem placar autorizado" });
  }
});

const publicChampionshipSchema = z.object({
  championship: z.object({
    public_id: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    format: z.enum(["league", "groups_knockout", "knockout"]),
    status: z.enum(["published", "active", "completed"]),
    win_points: z.number().int().min(0).max(10),
    draw_points: z.number().int().min(0).max(10),
    loss_points: z.number().int().min(0).max(10),
    tiebreak_order: z.array(z.enum([
      "wins",
      "goal_difference",
      "goals_for",
      "head_to_head",
    ])).min(1).max(4),
    group_count: z.number().int().min(2).max(8).nullable(),
    qualifiers_per_group: z.number().int().min(1).max(2).nullable(),
    published_at: z.string().datetime({ offset: true }),
  }).strict(),
  participants: z.array(publicParticipantSchema).min(2).max(32),
  standings: z.array(publicStandingSchema).max(32),
  fixtures: z.array(publicFixtureSchema).max(512),
}).strict();

export type PublicChampionship = z.infer<typeof publicChampionshipSchema>;
export type PublicChampionshipFixture = z.infer<typeof publicFixtureSchema>;
export type PublicChampionshipStanding = z.infer<typeof publicStandingSchema>;

export const getPublicChampionship = cache(
  async (publicId: string): Promise<PublicChampionship | null> => {
    if (!publicChampionshipId.safeParse(publicId).success) return null;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_championship", {
      requested_public_id: publicId,
    });

    if (error) {
      if (["42883", "42P01", "PGRST202"].includes(error.code ?? "")) {
        return null;
      }
      throw new Error("Não foi possível carregar o campeonato público.");
    }

    const parsed = publicChampionshipSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);

export const getPublicChampionshipWithFallback = cache(
  async (publicId: string): Promise<PublicChampionship | null> => {
    try {
      return await getPublicChampionship(publicId);
    } catch {
      return null;
    }
  },
);
