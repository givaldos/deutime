"use server";

import { requireUser } from "@/lib/auth/dal";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";
import {
  linkLineupSquadSchema,
  saveEventLineupDraftSchema,
} from "@/lib/validation/team-division";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

export type EventLineupActionState = {
  attempt?: number;
  outcome?: "success" | "error";
  message?: string;
  nextRequestId?: string;
};

function parseJsonField(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string" || value.length > maxLength) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function saveEventLineupDraft(
  previousState: EventLineupActionState,
  formData: FormData,
): Promise<EventLineupActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = saveEventLineupDraftSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    requestId: formData.get("requestId"),
    squads: parseJsonField(formData.get("squads"), 12_000),
    assignments: parseJsonField(formData.get("assignments"), 60_000),
    exclusions: parseJsonField(formData.get("exclusions"), 15_000),
  });
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise a divisão.",
    };
  }

  if (!(await isTeamFeatureEnabled(parsed.data.teamId, "team_division"))) {
    return {
      attempt,
      outcome: "error",
      message: "A divisão de times ainda não está disponível para este time.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_event_lineup_draft", {
    requested_event_id: parsed.data.eventId,
    request_id: parsed.data.requestId,
    requested_squads: parsed.data.squads,
    requested_assignments: parsed.data.assignments,
    requested_exclusions: parsed.data.exclusions,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message:
        error?.code === "42501"
          ? "Você não tem permissão para editar esta divisão."
          : error?.code === "55000"
            ? "A divisão está desligada ou o evento não aceita mais alterações."
            : error?.code === "23514"
              ? "A lista mudou. Atualize a página e revise os confirmados."
              : "Não foi possível salvar a divisão.",
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}`);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Esta divisão já estava salva."
      : `Rascunho salvo: ${data.assigned_count} distribuídos e ${data.excluded_count} fora.`,
  };
}

export async function linkEventLineupSquadToMatchSide(
  previousState: EventLineupActionState,
  formData: FormData,
): Promise<EventLineupActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = linkLineupSquadSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    matchId: formData.get("matchId"),
    sideIndex: formData.get("sideIndex"),
    squadId: formData.get("squadId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) {
    return { attempt, outcome: "error", message: "Vínculo inválido." };
  }
  if (!(await isTeamFeatureEnabled(parsed.data.teamId, "team_division"))) {
    return { attempt, outcome: "error", message: "A divisão está desligada." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "link_event_lineup_squad_to_match_side",
    {
      requested_match_id: parsed.data.matchId,
      requested_side_index: parsed.data.sideIndex,
      requested_squad_id: parsed.data.squadId,
      request_id: parsed.data.requestId,
    },
  );
  if (error) {
    return {
      attempt,
      outcome: "error",
      message:
        error.code === "42501"
          ? "Você não tem permissão para vincular esta partida."
          : "Não foi possível vincular o time a este lado.",
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}`);
  revalidatePath(
    `/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}/matches`,
  );
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: "Time vinculado à partida sem alterar presença ou RSVP.",
  };
}
