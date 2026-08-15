import "server-only";

import { createPrivilegedClient } from "@/lib/supabase/privileged";
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
export type PublicChampionshipOrganizer = {
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
};

type PublicChampionshipOrganizerRecord = PublicChampionshipOrganizer & {
  logo_path: string | null;
  cover_path: string | null;
};

export type PublicChampionshipOrganizerMediaKind = "logo" | "cover";

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
    const startedAt = Date.now();
    try {
      const state = await getPublicChampionship(publicId);
      console.info("public_championship_projection.observed", {
        format: state?.championship.format ?? "fallback",
        participantCount: state?.participants.length ?? 0,
        fixtureCount: state?.fixtures.length ?? 0,
        standingCount: state?.standings.length ?? 0,
        fallback: state === null,
        durationMs: durationSince(startedAt),
        error: "none",
      });
      return state;
    } catch {
      console.error("public_championship_projection.observed", {
        format: "fallback",
        participantCount: 0,
        fixtureCount: 0,
        standingCount: 0,
        fallback: true,
        durationMs: durationSince(startedAt),
        error: "projection_unavailable",
      });
      return null;
    }
  },
);

const getPublicChampionshipOrganizerRecord = cache(
  async (publicId: string): Promise<PublicChampionshipOrganizerRecord | null> => {
    if (!publicChampionshipId.safeParse(publicId).success) return null;

    try {
      // A identidade do organizador só é consultada depois que a mesma RPC
      // anônima confirma que o campeonato está efetivamente publicado.
      const state = await getPublicChampionship(publicId);
      if (!state) return null;

      const privileged = createPrivilegedClient();
      const { data: championship, error: championshipError } = await privileged
        .from("championships")
        .select("team_id")
        .eq("public_id", publicId)
        .eq("public_mode", "public")
        .in("status", ["published", "active", "completed"])
        .maybeSingle();
      if (championshipError || !championship?.team_id) return null;

      const { data: team, error: teamError } = await privileged
        .from("teams")
        .select("slug, name, team_media(kind, storage_path)")
        .eq("id", championship.team_id)
        .eq("is_public", true)
        .in("team_media.kind", ["logo", "cover"])
        .maybeSingle();
      if (teamError || !team?.slug || !team.name) return null;

      const logoPath = team.team_media.find((item) => item.kind === "logo")?.storage_path;
      const coverPath = team.team_media.find((item) => item.kind === "cover")?.storage_path;
      return {
        slug: team.slug,
        name: team.name,
        logo_url: null,
        cover_url: null,
        logo_path: logoPath ?? null,
        cover_path: coverPath ?? null,
      };
    } catch {
      // Branding é aprimoramento visual: indisponibilidade nunca derruba a
      // projeção esportiva nem amplia o acesso a um time não público.
      return null;
    }
  },
);

export const getPublicChampionshipOrganizer = cache(
  async (publicId: string): Promise<PublicChampionshipOrganizer | null> => {
    const organizer = await getPublicChampionshipOrganizerRecord(publicId);
    if (!organizer) return null;

    return {
      slug: organizer.slug,
      name: organizer.name,
      logo_url: organizer.logo_path ? `/c/${publicId}/media/logo` : null,
      cover_url: organizer.cover_path ? `/c/${publicId}/media/cover` : null,
    };
  },
);

export const getPublicChampionshipOrganizerMediaUrl = cache(
  async (
    publicId: string,
    kind: PublicChampionshipOrganizerMediaKind,
  ): Promise<string | null> => {
    const organizer = await getPublicChampionshipOrganizerRecord(publicId);
    const storagePath = kind === "logo"
      ? organizer?.logo_path
      : organizer?.cover_path;
    if (!storagePath) return null;

    try {
      const privileged = createPrivilegedClient();
      const { data, error } = await privileged.storage
        .from("team_media")
        .createSignedUrl(storagePath, 60);
      return error ? null : data?.signedUrl ?? null;
    } catch {
      return null;
    }
  },
);

function durationSince(startedAt: number) {
  return Math.min(30_000, Math.max(0, Date.now() - startedAt));
}
