import "server-only";

import {
  isPublicEventContractUnavailable,
  isPublicEventId,
} from "@/lib/features/public-event/presentation";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export type PublicEvent = {
  public_id: string;
  team_name: string;
  team_timezone: string;
  team_logo_url: string | null;
  title: string;
  kind:
    | "weekly_match"
    | "championship"
    | "friendly"
    | "tournament"
    | "training"
    | "other";
  sport_format: "field" | "society" | "futsal";
  starts_at: string;
  ends_at: string;
  opponent_name: string | null;
  status: "scheduled" | "cancelled" | "completed";
};

export const getPublicEvent = cache(
  async (publicId: string): Promise<PublicEvent | null> => {
    if (!isPublicEventId(publicId)) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_event_directory")
      .select(
        "public_id, team_name, team_timezone, title, kind, sport_format, starts_at, ends_at, opponent_name, status",
      )
      .eq("public_id", publicId)
      .maybeSingle();

    if (error) {
      if (isPublicEventContractUnavailable(error)) return null;
      throw new Error("Não foi possível carregar o evento público.");
    }

    if (
      !data?.public_id ||
      !data.team_name ||
      !data.team_timezone ||
      !data.title ||
      !data.kind ||
      !data.sport_format ||
      !data.starts_at ||
      !data.ends_at ||
      !data.status
    ) {
      return null;
    }

    // Busca logo do time em paralelo — falha silenciosa se não existir.
    const teamLogoUrl = await getTeamLogoUrlByEventPublicId(publicId);

    return {
      public_id: data.public_id,
      team_name: data.team_name,
      team_timezone: data.team_timezone,
      team_logo_url: teamLogoUrl,
      title: data.title,
      kind: data.kind,
      sport_format: data.sport_format,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      opponent_name: data.opponent_name,
      status: data.status,
    };
  },
);

async function getTeamLogoUrlByEventPublicId(
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
