import "server-only";

import { createPrivilegedClient } from "@/lib/supabase/privileged";
import sharp from "sharp";

/**
 * Busca o logo do time e devolve um data URL PNG compatível com next/og.
 * Converte automaticamente WebP → PNG via sharp.
 * Uso: página pública e opengraph (convite.png), sem publicar a signed URL.
 */
export async function getTeamLogoPngDataUrlByEventPublicId(
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

    // Signed URL com TTL curto — só usada para download imediato
    const { data: signed } = await privileged.storage
      .from("team_media")
      .createSignedUrl(mediaRow.storage_path, 60);
    if (!signed?.signedUrl) return null;

    const response = await fetch(signed.signedUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());

    // Converte para PNG independente do formato original (WebP, JPEG, etc.)
    const png = await sharp(buffer)
      .resize(160, 160, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
