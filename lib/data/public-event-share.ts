import "server-only";

import { isPublicEventId } from "@/lib/features/public-event/presentation";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { z } from "zod";

const publicShareEventSchema = z.object({
  team_name: z.string().trim().min(1).max(160),
  team_timezone: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  kind: z.string().trim().min(1).max(40),
  sport_format: z.string().trim().min(1).max(40),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  status: z.enum(["scheduled", "cancelled", "completed"]),
}).strict();

const publicShareLineupSchema = z.object({
  revision: z.number().int().positive(),
  published_at: z.string().datetime({ offset: true }),
  squads: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
    sort_order: z.number().int().min(1).max(12),
    athletes: z.array(z.object({
      name: z.string().trim().min(1).max(120),
      sort_order: z.number().int().positive(),
    }).strict()).max(300),
  }).strict()).min(2).max(12),
}).strict();

const publicShareMatchSchema = z.object({
  ordinal: z.number().int().min(1).max(32),
  status: z.enum(["live", "finalized"]),
  public_mode: z.enum(["live", "final_result"]),
  sides: z.array(z.object({
    side_index: z.number().int().min(1).max(2),
    label: z.string().trim().min(1).max(60),
    score: z.number().int().min(0),
  }).strict()).length(2),
  events: z.array(z.object({
    kind: z.enum([
      "goal",
      "own_goal",
      "yellow_card",
      "red_card",
      "substitution",
      "score_adjustment",
    ]),
    side_index: z.number().int().min(1).max(2).nullable(),
    minute: z.number().int().min(0).max(300).nullable(),
  }).strict()).max(1000),
}).strict();

const publicEventShareStateSchema = z.object({
  phase: z.enum([
    "cancelled",
    "live",
    "voting",
    "result",
    "score",
    "lineup",
    "completed",
    "call",
  ]),
  event: publicShareEventSchema,
  lineup: publicShareLineupSchema.nullable(),
  match: publicShareMatchSchema.nullable(),
  voting: z.object({
    closes_at: z.string().datetime({ offset: true }),
  }).strict().nullable(),
  result: z.object({
    winner_name: z.string().trim().min(1).max(120).nullable(),
    vote_count: z.number().int().positive().nullable(),
    vote_percentage: z.number().min(0).max(100).nullable(),
    total_votes: z.number().int().positive(),
    tied: z.boolean(),
  }).strict().nullable(),
}).strict().superRefine((state, context) => {
  const expectsMatch = ["live", "voting", "result", "score"].includes(state.phase);
  if (expectsMatch !== (state.match !== null)) {
    context.addIssue({ code: "custom", message: "Fase e partida divergentes" });
  }
  if ((state.phase === "lineup") !== (state.lineup !== null)) {
    context.addIssue({ code: "custom", message: "Fase e escalação divergentes" });
  }
  if ((state.phase === "voting") !== (state.voting !== null)) {
    context.addIssue({ code: "custom", message: "Fase e votação divergentes" });
  }
  if ((state.phase === "result") !== (state.result !== null)) {
    context.addIssue({ code: "custom", message: "Fase e resultado divergentes" });
  }
});

export type PublicEventShareState = z.infer<typeof publicEventShareStateSchema>;

export const getPublicEventShareState = cache(
  async (publicId: string): Promise<PublicEventShareState | null> => {
    if (!isPublicEventId(publicId)) return null;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_event_share_state", {
      requested_public_id: publicId,
    });

    if (error) {
      if (error.code === "42883" || error.code === "42P01") return null;
      throw new Error("Não foi possível carregar o contexto compartilhável.");
    }

    const parsed = publicEventShareStateSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);
