import "server-only";

import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";

export type MatchConversationModerationItem = {
  matchId: string;
  matchOrdinal: number;
  commentId: string;
  parentCommentId: string | null;
  authorName: string;
  body: string;
  status: "active" | "moderated";
  createdAt: string;
  moderationReason: string | null;
  reportCount: number;
  reportReasons: string[];
};

type ModerationRow = {
  match_id: string;
  match_ordinal: number;
  comment_id: string;
  parent_comment_id: string | null;
  author_display_name: string;
  body: string;
  status: "active" | "author_deleted" | "moderated";
  created_at: string;
  moderation_reason: string | null;
  report_count: number;
  report_reasons: string[];
};

export async function getMatchConversationModeration(
  teamId: string,
  eventId: string,
): Promise<MatchConversationModerationItem[] | null> {
  if (!(await isTeamFeatureEnabled(teamId, "comments"))) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_match_conversation_moderation",
    { requested_event_id: eventId },
  );

  if (error || !data) return null;

  return (data as ModerationRow[])
    .filter((row) => row.status !== "author_deleted")
    .map((row) => ({
      matchId: row.match_id,
      matchOrdinal: row.match_ordinal,
      commentId: row.comment_id,
      parentCommentId: row.parent_comment_id,
      authorName: row.author_display_name,
      body: row.body,
      status: row.status === "moderated" ? "moderated" : "active",
      createdAt: row.created_at,
      moderationReason: row.moderation_reason,
      reportCount: Number(row.report_count),
      reportReasons: row.report_reasons,
    }));
}
