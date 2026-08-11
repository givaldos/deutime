"use server";

import { requireUser } from "@/lib/auth/dal";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";
import {
  eventLineupPublicationSchema,
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
  nextPublicationRequestId?: string;
  published?: boolean;
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
      : `Divisão salva: ${data.assigned_count} distribuídos e ${data.excluded_count} fora.`,
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

async function changeEventLineupPublication(
  previousState: EventLineupActionState,
  formData: FormData,
  command: "publish" | "withdraw",
): Promise<EventLineupActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = eventLineupPublicationSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    publicId: formData.get("publicId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) {
    return { attempt, outcome: "error", message: "Publicação inválida." };
  }
  if (!(await isTeamFeatureEnabled(parsed.data.teamId, "team_division"))) {
    return { attempt, outcome: "error", message: "A divisão está desligada." };
  }

  const supabase = await createClient();
  const functionName = command === "publish"
    ? "publish_event_lineup"
    : "withdraw_event_lineup_publication";
  const { data, error } = await supabase.rpc(functionName, {
    requested_event_id: parsed.data.eventId,
    request_id: parsed.data.requestId,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message:
        error?.code === "42501"
          ? "Somente owner ou admin pode alterar a publicação."
          : error?.code === "23514"
            ? "Distribua ao menos um atleta em cada time antes de publicar."
            : error?.code === "55000"
              ? "A publicação está desligada ou o evento não aceita alterações."
              : "Não foi possível alterar a publicação.",
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}`);
  revalidatePath(`/e/${parsed.data.publicId}`);
  revalidatePath(`/e/${parsed.data.publicId}/convite.png`);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: command === "publish"
      ? data.replayed
        ? "Esta revisão já estava publicada."
        : `Revisão publicada com ${data.squad_count} times e ${data.assigned_count} atletas.`
      : data.replayed
        ? "Esta retirada já havia sido registrada."
        : "Publicação retirada. O rascunho continua salvo.",
  };
}

export async function publishEventLineup(
  previousState: EventLineupActionState,
  formData: FormData,
) {
  return changeEventLineupPublication(previousState, formData, "publish");
}

export async function saveAndPublishEventLineup(
  previousState: EventLineupActionState,
  formData: FormData,
): Promise<EventLineupActionState> {
  const saved = await saveEventLineupDraft(previousState, formData);
  if (saved.outcome !== "success") return saved;

  const publicationForm = new FormData();
  for (const field of ["teamId", "teamSlug", "eventId", "publicId"] as const) {
    const value = formData.get(field);
    if (value !== null) publicationForm.set(field, value);
  }
  const publicationRequestId = formData.get("publicationRequestId");
  if (publicationRequestId !== null) {
    publicationForm.set("requestId", publicationRequestId);
  }

  const published = await changeEventLineupPublication(
    previousState,
    publicationForm,
    "publish",
  );
  if (published.outcome !== "success") {
    return {
      ...published,
      nextRequestId: saved.nextRequestId,
      message: `A divisão foi salva, mas não publicada. ${published.message ?? "Tente novamente."}`,
    };
  }

  return {
    ...published,
    nextRequestId: saved.nextRequestId,
    nextPublicationRequestId: published.nextRequestId,
    published: true,
    message: "Divisão salva e publicada para a galera.",
  };
}

export async function withdrawEventLineupPublication(
  previousState: EventLineupActionState,
  formData: FormData,
) {
  return changeEventLineupPublication(previousState, formData, "withdraw");
}
