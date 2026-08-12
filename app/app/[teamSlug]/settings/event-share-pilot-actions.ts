"use server";

import { requireUser } from "@/lib/auth/dal";
import { parseEventSharePilotConfig } from "@/lib/features/public-event/pilot-config";
import { createClient } from "@/lib/supabase/server";
import { eventSharePilotActionSchema } from "@/lib/validation/event-share-pilot";
import { revalidatePath } from "next/cache";

export type EventSharePilotActionState = {
  outcome?: "success" | "error";
  message?: string;
};

export async function setEventSharePilotState(
  _previousState: EventSharePilotActionState,
  formData: FormData,
): Promise<EventSharePilotActionState> {
  await requireUser();

  const parsed = eventSharePilotActionSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    enabled: formData.get("enabled"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      outcome: "error",
      message: "Confirme a operação antes de alterar o piloto.",
    };
  }

  let pilotTeamId: string | null = null;
  try {
    pilotTeamId = parseEventSharePilotConfig(process.env)?.teamId ?? null;
  } catch {
    return {
      outcome: "error",
      message: "O controle operacional do piloto está indisponível.",
    };
  }
  if (!pilotTeamId) {
    return {
      outcome: "error",
      message: "O controle operacional do piloto está indisponível.",
    };
  }

  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, slug")
    .eq("slug", parsed.data.teamSlug)
    .maybeSingle();
  if (teamError || !team) {
    return {
      outcome: "error",
      message: "Não foi possível confirmar o time do piloto.",
    };
  }
  if (team.id !== pilotTeamId) {
    return {
      outcome: "error",
      message: "Este time não pertence à coorte autorizada.",
    };
  }

  const { data, error } = await supabase.rpc("set_team_feature_flag", {
    requested_team_id: team.id,
    requested_feature: "event_share_card",
    requested_enabled: parsed.data.enabled,
  });
  if (
    error ||
    !data ||
    data.team_id !== team.id ||
    data.feature !== "event_share_card" ||
    data.enabled !== parsed.data.enabled
  ) {
    return {
      outcome: "error",
      message:
        error?.code === "42501"
          ? "Somente owner ou admin pode alterar o piloto."
          : "Não foi possível alterar o piloto do cartão público.",
    };
  }

  console.info("event_share_pilot.flag_changed", {
    enabled: parsed.data.enabled,
  });
  revalidatePath(`/app/${team.slug}/settings`);

  return {
    outcome: "success",
    message: parsed.data.enabled
      ? "Piloto ativado somente para esta coorte."
      : "Rollback concluído; o cartão anterior voltou a ser usado.",
  };
}
