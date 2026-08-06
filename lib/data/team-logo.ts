import "server-only";

import { createPrivilegedClient } from "@/lib/supabase/privileged";

/**
 * Busca a signed URL do logo do time a partir do public_id do evento.
 * Usa service_role para bypasear RLS — falha silenciosa, nunca quebra o caller.
 */
export async function getTeamLogoUrlByEventPublicId(
  publicId: string,
): Promise<string | null> {
  try {
    const privileged = createPrivilegedClient();

    const { data: eventRow } = await privileged
      .from("events")
      .select("team_id")
      .eq("public_id", publicId)
      .maybeSingle();
    if (!eventRow?.team_id) return null;

    const { data: mediaRow } = await privileged
      .from("team_media")
      .select("storage_path")
      .eq("team_id", eventRow.team_id)
      .eq("kind", "logo")
      .maybeSingle();
    if (!mediaRow?.storage_path) return null;

    const { data: signed } = await privileged.storage
      .from("team_media")
      .createSignedUrl(mediaRow.storage_path, 3600);
    return signed?.signedUrl ?? null;
  } catch {
    return null;
  }
}
