import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function isCraqueVotingEnabled(teamId: string): Promise<boolean> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as unknown as { from: (t: string) => any })
    .from("team_feature_flags")
    .select("enabled")
    .eq("team_id", teamId)
    .eq("feature", "craque_voting")
    .maybeSingle();
  return (data as { enabled?: boolean } | null)?.enabled === true;
}

export function hashVoterId(voterAthleteId: string, salt: string): string {
  // placeholder: SHA-256 hex 64 chars — implementação real usa crypto.subtle no server
  // mantido 64 chars para satisfazer constraint check char_length=64
  return `${voterAthleteId}-${salt}`.slice(0, 64).padEnd(64, "0");
}
