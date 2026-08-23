import "server-only";

import {
  recognitionCatalogVersion,
  recognitionKinds,
} from "@/lib/features/recognition/catalog";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const publicRecognitionSchema = z
  .object({
    catalog_version: z.literal(recognitionCatalogVersion),
    kind: z.enum(recognitionKinds),
    recognition_count: z.number().int().positive().max(1_000_000),
  })
  .strict();

const publicRecognitionListSchema = z
  .array(publicRecognitionSchema)
  .max(recognitionKinds.length)
  .superRefine((items, context) => {
    if (new Set(items.map((item) => item.kind)).size !== items.length) {
      context.addIssue({
        code: "custom",
        message: "Categorias de reconhecimento duplicadas.",
      });
    }
  });

export type PublicRecognitionSummary = z.infer<
  typeof publicRecognitionSchema
>;

export async function getPublicRecognitionSummary(
  handle: string,
): Promise<PublicRecognitionSummary[]> {
  const startedAt = Date.now();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_public_recognition_summary",
      { requested_handle: handle },
    );
    if (error) {
      observePublicRecognition([], startedAt, true, "rpc_unavailable");
      return [];
    }

    const parsed = publicRecognitionListSchema.safeParse(data ?? []);
    if (!parsed.success) {
      observePublicRecognition([], startedAt, true, "invalid_payload");
      return [];
    }

    observePublicRecognition(parsed.data, startedAt, false, "none");
    return parsed.data;
  } catch {
    observePublicRecognition([], startedAt, true, "projection_unavailable");
    return [];
  }
}

function observePublicRecognition(
  items: PublicRecognitionSummary[],
  startedAt: number,
  fallback: boolean,
  error: "none" | "rpc_unavailable" | "invalid_payload" | "projection_unavailable",
) {
  const payload = {
    categoryCount: items.length,
    recognitionCount: items.reduce(
      (total, item) => total + item.recognition_count,
      0,
    ),
    fallback,
    durationMs: Math.max(0, Date.now() - startedAt),
    error,
  };

  if (fallback) {
    console.error("public_recognition_projection.observed", payload);
  } else {
    console.info("public_recognition_projection.observed", payload);
  }
}

export async function getPublicPlayer(handle: string) {
  const supabase = await createClient();
  const [
    { data, error },
    { data: statisticRows, error: statisticsError },
    recognitions,
  ] = await Promise.all([
      supabase
        .from("public_player_directory")
        .select(
          "handle, display_name, preferred_name, bio, photo_path, positions",
        )
        .eq("handle", handle)
        .maybeSingle(),
      supabase.rpc("get_public_player_statistics", {
        requested_handle: handle,
      }),
      getPublicRecognitionSummary(handle),
    ]);

  if (error || statisticsError) {
    throw new Error("Não foi possível carregar o perfil público.");
  }
  if (!data) return null;
  const { data: signedPhoto } = data.photo_path
    ? await createPrivilegedClient().storage
        .from("athlete_avatars")
        .createSignedUrl(data.photo_path, 3600)
    : { data: null };

  return {
    ...data,
    photo_url: signedPhoto?.signedUrl ?? null,
    recognitions,
    statistics: statisticRows?.[0] ?? {
      matches_played: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
    },
  };
}
