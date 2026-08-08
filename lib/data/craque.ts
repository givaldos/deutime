import "server-only";

import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";

export type CraqueBallot = {
  matchId: string;
  ordinal: number;
  closesAt: string | null;
  eligible: boolean;
  alreadyVoted: boolean;
  candidates: { id: string; name: string }[];
};

export async function getMyCraqueBallots(
  teamId: string,
  eventId: string,
): Promise<CraqueBallot[] | null> {
  if (!(await isTeamFeatureEnabled(teamId, "voting"))) return null;

  const supabase = await createClient();
  const { data: matches, error: matchesError } = await supabase
    .from("event_matches")
    .select("id, ordinal, craque_voting_closes_at")
    .eq("team_id", teamId)
    .eq("event_id", eventId)
    .eq("status", "finalized")
    .order("ordinal");

  if (matchesError || !matches?.length) return [];

  const matchIds = matches.map((match) => match.id);
  const { data: participations, error: participationsError } = await supabase
    .from("match_participations")
    .select("match_id, athlete_id")
    .in("match_id", matchIds);
  if (participationsError) return null;

  const athleteIds = Array.from(
    new Set((participations ?? []).map((item) => item.athlete_id)),
  );
  const { data: athletes, error: athletesError } = athleteIds.length
    ? await supabase
        .from("athletes")
        .select("id, full_name, preferred_name")
        .eq("team_id", teamId)
        .in("id", athleteIds)
    : { data: [], error: null };
  if (athletesError) return null;

  const athleteById = new Map(
    (athletes ?? []).map((athlete) => [
      athlete.id,
      athlete.preferred_name || athlete.full_name,
    ]),
  );
  const statusResults = await Promise.all(
    matches.map((match) =>
      supabase.rpc("get_my_craque_vote_status", {
        requested_match_id: match.id,
      }),
    ),
  );

  return matches.flatMap((match, index) => {
    const statusResult = statusResults[index];
    const status = statusResult?.error ? null : statusResult?.data?.[0];
    if (!status) return [];

    const candidates = (participations ?? [])
      .filter((item) => item.match_id === match.id)
      .flatMap((item) => {
        const name = athleteById.get(item.athlete_id);
        return name ? [{ id: item.athlete_id, name }] : [];
      })
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

    return [
      {
        matchId: match.id,
        ordinal: match.ordinal,
        closesAt: status.voting_closes_at,
        eligible: status.eligible,
        alreadyVoted: status.already_voted,
        candidates,
      },
    ];
  });
}

export async function verifyCraqueVoteReceipt(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_craque_vote_receipt", {
    requested_receipt_token: token,
  });

  return !error && data === true;
}
