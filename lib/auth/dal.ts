import "server-only";

import { resolveDashboardDestinationFromLookups } from "@/lib/auth/destination";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { redirect } from "next/navigation";

export const getSessionDestination = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") return null;

  return resolveDashboardDestinationFromLookups({
    lookupActiveTeamMembership: async () => {
      const { data: membership, error: membershipError } = await supabase
        .from("team_memberships")
        .select("team_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      return {
        exists: Boolean(membership),
        failed: Boolean(membershipError),
      };
    },
    lookupPlayerProfile: async () => {
      const { data: playerProfile, error: playerProfileError } = await supabase
        .from("player_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        exists: Boolean(playerProfile),
        failed: Boolean(playerProfileError),
      };
    },
    reportFailure: (lookup) => {
      console.error(JSON.stringify({
        event: "session_destination_lookup",
        lookup,
        outcome: "failed",
      }));
    },
  });
});

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/auth/login");
  }

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});
