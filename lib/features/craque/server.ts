import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function isCraqueVotingEnabled(teamId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_feature_flags")
    .select("enabled")
    .eq("team_id", teamId)
    .eq("feature", "voting")
    .maybeSingle();
  return !error && data?.enabled === true;
}
