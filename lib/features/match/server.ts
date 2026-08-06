import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function isEventMatchesEnabled(teamId: string): Promise<boolean> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as unknown as { from: (t: string) => any }).from("team_feature_flags").select("enabled").eq("team_id", teamId).eq("feature", "event_matches").maybeSingle();
  return (data as { enabled?: boolean } | null)?.enabled === true;
}
