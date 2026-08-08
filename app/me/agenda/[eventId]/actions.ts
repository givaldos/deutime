"use server";

import { requireUser } from "@/lib/auth/dal";
import { craqueVoteSchema } from "@/lib/features/craque/validation";
import {
  createMatchCommentSchema,
  deleteMatchCommentSchema,
  reportMatchCommentSchema,
} from "@/lib/features/match-conversation/validation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CraqueVoteActionState = {
  outcome?: "success" | "error" | "unavailable" | "already_voted";
  message?: string;
  receiptToken?: string;
  receiptExpiresAt?: string;
};

export type MatchConversationActionState = {
  outcome?: "success" | "error" | "unavailable" | "invalid" | "rate_limited";
  message?: string;
};

export async function castCraqueVoteAction(
  _previousState: CraqueVoteActionState,
  formData: FormData,
): Promise<CraqueVoteActionState> {
  await requireUser();
  const parsed = craqueVoteSchema.safeParse({
    eventId: formData.get("eventId"),
    matchId: formData.get("matchId"),
    candidateAthleteId: formData.get("candidateAthleteId"),
  });

  if (!parsed.success) {
    return {
      outcome: "unavailable",
      message: "Esta votação não está disponível.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cast_craque_vote", {
    requested_match_id: parsed.data.matchId,
    requested_candidate_athlete_id: parsed.data.candidateAthleteId,
  });

  if (error) {
    if (error.code === "23505") {
      revalidatePath(`/me/agenda/${parsed.data.eventId}`);
      return {
        outcome: "already_voted",
        message: "Seu voto já foi computado nesta partida.",
      };
    }
    if (error.code === "42501" || error.code === "55000") {
      return {
        outcome: "unavailable",
        message: "Esta votação não está disponível para você agora.",
      };
    }
    return {
      outcome: "error",
      message: "Não foi possível computar seu voto. Tente novamente.",
    };
  }

  const receipt = data?.[0];
  if (!receipt) {
    return {
      outcome: "error",
      message: "Não foi possível confirmar seu voto. Tente novamente.",
    };
  }

  revalidatePath(`/me/agenda/${parsed.data.eventId}`);
  return {
    outcome: "success",
    message: "Voto computado. Sua escolha continua anônima.",
    receiptToken: receipt.receipt_token,
    receiptExpiresAt: receipt.receipt_expires_at,
  };
}

export async function createMatchCommentAction(
  _previousState: MatchConversationActionState,
  formData: FormData,
): Promise<MatchConversationActionState> {
  await requireUser();
  const parentCommentId = String(formData.get("parentCommentId") ?? "").trim();
  const parsed = createMatchCommentSchema.safeParse({
    eventId: formData.get("eventId"),
    matchId: formData.get("matchId"),
    parentCommentId: parentCommentId || undefined,
    body: formData.get("body"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) {
    return {
      outcome: "invalid",
      message: parsed.error.issues[0]?.message ?? "Revise sua mensagem.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_match_comment", {
    requested_match_id: parsed.data.matchId,
    requested_body: parsed.data.body,
    requested_idempotency_key: parsed.data.idempotencyKey,
    ...(parsed.data.parentCommentId
      ? { requested_parent_comment_id: parsed.data.parentCommentId }
      : {}),
  });

  if (error) {
    if (error.code === "42501" || error.code === "55000") {
      return {
        outcome: "unavailable",
        message: "A conversa não está disponível para você agora.",
      };
    }
    if (error.code === "22023") {
      return {
        outcome: "invalid",
        message: "Use apenas texto, sem links ou HTML.",
      };
    }
    if (error.code === "54000") {
      return {
        outcome: "rate_limited",
        message: "Você enviou mensagens rápido demais. Aguarde um minuto.",
      };
    }
    return {
      outcome: "error",
      message: "Não foi possível publicar. Tente novamente.",
    };
  }

  revalidatePath(`/me/agenda/${parsed.data.eventId}`);
  return { outcome: "success", message: "Comentário publicado." };
}

export async function deleteMatchCommentAction(
  _previousState: MatchConversationActionState,
  formData: FormData,
): Promise<MatchConversationActionState> {
  await requireUser();
  const parsed = deleteMatchCommentSchema.safeParse({
    eventId: formData.get("eventId"),
    commentId: formData.get("commentId"),
  });

  if (!parsed.success) {
    return { outcome: "unavailable", message: "Comentário indisponível." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_match_comment", {
    requested_comment_id: parsed.data.commentId,
  });
  if (error) {
    return {
      outcome: error.code === "42501" ? "unavailable" : "error",
      message:
        error.code === "42501"
          ? "Este comentário não pode mais ser removido por você."
          : "Não foi possível remover o comentário.",
    };
  }

  revalidatePath(`/me/agenda/${parsed.data.eventId}`);
  return { outcome: "success", message: "Comentário removido." };
}

export async function reportMatchCommentAction(
  _previousState: MatchConversationActionState,
  formData: FormData,
): Promise<MatchConversationActionState> {
  await requireUser();
  const parsed = reportMatchCommentSchema.safeParse({
    eventId: formData.get("eventId"),
    commentId: formData.get("commentId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      outcome: "invalid",
      message: "Explique o motivo em até 500 caracteres.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_match_comment", {
    requested_comment_id: parsed.data.commentId,
    requested_reason: parsed.data.reason,
  });
  if (error) {
    return {
      outcome: error.code === "42501" ? "unavailable" : "error",
      message:
        error.code === "42501"
          ? "Este comentário não está disponível para denúncia."
          : "Não foi possível enviar a denúncia.",
    };
  }

  revalidatePath(`/me/agenda/${parsed.data.eventId}`);
  return {
    outcome: "success",
    message: "Denúncia enviada para a equipe do time.",
  };
}
