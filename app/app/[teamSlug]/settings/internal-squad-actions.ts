"use server";

import { requireUser } from "@/lib/auth/dal";
import { isTeamFeatureEnabled } from "@/lib/features/delivery/server";
import { createClient } from "@/lib/supabase/server";
import {
  saveInternalSquadsSchema,
  saveProfessionalInternalSquadsSchema,
} from "@/lib/validation/team-division";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

export type InternalSquadActionState = {
  attempt?: number;
  outcome?: "success" | "error";
  message?: string;
  nextRequestId?: string;
};

function parseSquads(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 12_000) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function saveInternalSquads(
  previousState: InternalSquadActionState,
  formData: FormData,
): Promise<InternalSquadActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const rawTeamId = formData.get("teamId");
  const professionalSchedulingEnabled =
    typeof rawTeamId === "string" &&
    (await isTeamFeatureEnabled(rawTeamId, "professional_scheduling"));
  const input = {
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    requestId: formData.get("requestId"),
    squads: parseSquads(formData.get("squads")),
    defaultHomeTeamId: formData.get("defaultHomeTeamId"),
    defaultAwayTeamId: formData.get("defaultAwayTeamId"),
  };
  const parsed = professionalSchedulingEnabled
    ? saveProfessionalInternalSquadsSchema.safeParse(input)
    : saveInternalSquadsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise as equipes internas.",
    };
  }
  if (!(await isTeamFeatureEnabled(parsed.data.teamId, "team_division"))) {
    return { attempt, outcome: "error", message: "A divisão de times está desligada." };
  }

  const supabase = await createClient();
  const defaultHomeTeamId = "defaultHomeTeamId" in parsed.data &&
    typeof parsed.data.defaultHomeTeamId === "string"
    ? parsed.data.defaultHomeTeamId
    : null;
  const defaultAwayTeamId = "defaultAwayTeamId" in parsed.data &&
    typeof parsed.data.defaultAwayTeamId === "string"
    ? parsed.data.defaultAwayTeamId
    : null;
  const { data, error } = professionalSchedulingEnabled &&
    defaultHomeTeamId && defaultAwayTeamId
    ? await supabase.rpc("replace_team_squad_presets_v2", {
        requested_team_id: parsed.data.teamId,
        request_id: parsed.data.requestId,
        requested_presets: parsed.data.squads,
        requested_default_home_team_id: defaultHomeTeamId,
        requested_default_away_team_id: defaultAwayTeamId,
      })
    : await supabase.rpc("replace_team_squad_presets", {
        requested_team_id: parsed.data.teamId,
        request_id: parsed.data.requestId,
        requested_presets: parsed.data.squads,
      });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: error?.code === "42501"
        ? "Somente owner ou admin pode alterar as equipes internas."
        : "Não foi possível salvar as equipes internas.",
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}/settings`);
  revalidatePath(`/app/${parsed.data.teamSlug}/events`);
  revalidatePath(`/app/${parsed.data.teamSlug}/championships`);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Essas equipes já estavam salvas."
      : `${data.preset_count} equipes internas prontas para os próximos jogos.`,
  };
}
