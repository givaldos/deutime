import "server-only";

import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";

export type MatchConversationComment = {
  id: string;
  parentId: string | null;
  authorName: string;
  body: string | null;
  status: "active" | "author_deleted" | "moderated";
  createdAt: string;
  canDelete: boolean;
};

export type MatchConversation = {
  matchId: string;
  ordinal: number;
  writable: boolean;
  closesAt: string | null;
  comments: MatchConversationComment[];
};

export async function getMatchConversations(
  teamId: string,
  eventId: string,
): Promise<MatchConversation[] | null> {
  if (!(await isTeamFeatureEnabled(teamId, "comments"))) return null;

  const supabase = await createClient();
  const { data: matches, error: matchesError } = await supabase
    .from("event_matches")
    .select("id, ordinal")
    .eq("team_id", teamId)
    .eq("event_id", eventId)
    .eq("status", "finalized")
    .order("ordinal");

  if (matchesError) return null;
  if (!matches?.length) return [];

  const stateResults = await Promise.all(
    matches.map((match) =>
      supabase.rpc("get_match_conversation_state", {
        requested_match_id: match.id,
      }),
    ),
  );

  // Banco N−1 ou falha de autorização: omite a capacidade e preserva a súmula.
  if (stateResults.some((result) => result.error)) return null;

  const accessibleMatches = matches.flatMap((match, index) => {
    const state = stateResults[index]?.data?.[0];
    return state?.accessible ? [{ match, state }] : [];
  });
  if (!accessibleMatches.length) return [];

  const commentResults = await Promise.all(
    accessibleMatches.map(({ match }) =>
      supabase.rpc("get_match_conversation", {
        requested_match_id: match.id,
      }),
    ),
  );
  if (commentResults.some((result) => result.error)) return null;

  return accessibleMatches.map(({ match, state }, index) => ({
    matchId: match.id,
    ordinal: match.ordinal,
    writable: state.writable,
    closesAt: state.closes_at,
    comments: (commentResults[index]?.data ?? []).map((comment) => ({
      id: comment.comment_id,
      parentId: comment.parent_comment_id,
      authorName: comment.author_display_name,
      body: comment.body ?? null,
      status: comment.status,
      createdAt: comment.created_at,
      canDelete: comment.can_delete,
    })),
  }));
}
