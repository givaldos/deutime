"use server";

import { requireUser } from "@/lib/auth/dal";
import { craqueVoteSchema } from "@/lib/features/craque/validation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CraqueVoteActionState = {
  outcome?: "success" | "error" | "unavailable" | "already_voted";
  message?: string;
  receiptToken?: string;
  receiptExpiresAt?: string;
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
