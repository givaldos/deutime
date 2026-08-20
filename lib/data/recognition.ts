import "server-only";

import {
  recognitionCatalogVersion,
  recognitionKinds,
} from "@/lib/features/recognition/catalog";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { z } from "zod";

const recognitionSchema = z
  .object({
    catalog_version: z.literal(recognitionCatalogVersion),
    kind: z.enum(recognitionKinds),
    team_id: z.string().uuid(),
    team_name: z.string().trim().min(1).max(160),
    source_id: z.string().uuid(),
    match_id: z.string().uuid(),
    event_id: z.string().uuid(),
    event_title: z.string().trim().min(1).max(160),
    match_ordinal: z.number().int().min(1).max(32),
    recognized_at: z.string().datetime({ offset: true }),
  })
  .strict();

const recognitionListSchema = z.array(recognitionSchema).max(1_000);

export type Recognition = z.infer<typeof recognitionSchema>;

async function lookupRecognitionEnabledTeamIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamIds: string[],
): Promise<string[]> {
  const uniqueTeamIds = [...new Set(teamIds)];
  if (!uniqueTeamIds.length) return [];

  const lookups = await Promise.all(
    uniqueTeamIds.map(async (teamId) => ({
      teamId,
      result: await supabase.rpc("is_team_feature_enabled", {
        requested_team_id: teamId,
        requested_feature: "recognition",
      }),
    })),
  );

  return lookups
    .filter(({ result }) => !result.error && result.data === true)
    .map(({ teamId }) => teamId);
}

export async function loadRecognitionEnabledTeamIds(
  teamIds: string[],
): Promise<string[]> {
  try {
    const supabase = await createClient();
    return await lookupRecognitionEnabledTeamIds(supabase, teamIds);
  } catch {
    return [];
  }
}

export async function loadRecognitionAvailability(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: links, error: linksError } = await supabase.rpc(
      "list_my_player_team_links",
    );
    if (linksError) return false;

    const activeTeamIds = [
      ...new Set(
        (links ?? [])
          .filter((link) => link.athlete_status === "active")
          .map((link) => link.team_id),
      ),
    ];
    if (!activeTeamIds.length) return false;

    const enabledTeamIds = await lookupRecognitionEnabledTeamIds(
      supabase,
      activeTeamIds,
    );
    return enabledTeamIds.length > 0;
  } catch {
    return false;
  }
}

export const getRecognitionAvailability = cache(loadRecognitionAvailability);

export async function loadMyRecognitions(): Promise<Recognition[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_my_recognitions");
    if (error) return null;

    const parsed = recognitionListSchema.safeParse(data ?? []);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const getMyRecognitions = cache(loadMyRecognitions);
