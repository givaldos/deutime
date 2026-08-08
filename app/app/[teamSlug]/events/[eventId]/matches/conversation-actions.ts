"use server";

import { requireUser } from "@/lib/auth/dal";
import { moderateMatchCommentSchema } from "@/lib/features/match-conversation/validation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ConversationModerationActionState = {
  outcome?: "success" | "error" | "unavailable" | "invalid";
  message?: string;
};

async function moderate(
  operation: "hide" | "restore",
  formData: FormData,
): Promise<ConversationModerationActionState> {
  await requireUser();
  const parsed = moderateMatchCommentSchema.safeParse({
    eventId: formData.get("eventId"),
    teamSlug: formData.get("teamSlug"),
    commentId: formData.get("commentId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      outcome: "invalid",
      message: parsed.error.issues[0]?.message ?? "Revise o motivo.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    operation === "hide"
      ? "moderate_match_comment"
      : "restore_match_comment",
    {
      requested_comment_id: parsed.data.commentId,
      requested_reason: parsed.data.reason,
    },
  );

  if (error) {
    return {
      outcome:
        error.code === "42501" || error.code === "55000"
          ? "unavailable"
          : "error",
      message:
        error.code === "42501" || error.code === "55000"
          ? "Este comentário não está disponível para esta decisão."
          : "Não foi possível concluir a moderação.",
    };
  }

  revalidatePath(
    `/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}/matches`,
  );
  revalidatePath(`/me/agenda/${parsed.data.eventId}`);
  return {
    outcome: "success",
    message:
      operation === "hide" ? "Comentário ocultado." : "Comentário restaurado.",
  };
}

export async function hideMatchCommentAction(
  _previousState: ConversationModerationActionState,
  formData: FormData,
) {
  return moderate("hide", formData);
}

export async function restoreMatchCommentAction(
  _previousState: ConversationModerationActionState,
  formData: FormData,
) {
  return moderate("restore", formData);
}
