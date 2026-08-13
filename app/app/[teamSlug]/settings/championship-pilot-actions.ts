"use server";

import { requireUser } from "@/lib/auth/dal";
import { parseChampionshipPilotConfig } from "@/lib/features/championships/pilot-config";
import { createClient } from "@/lib/supabase/server";
import { championshipPilotActionSchema } from "@/lib/validation/championship-pilot";
import { revalidatePath } from "next/cache";

export type ChampionshipPilotActionState = {
  outcome?: "success" | "error";
  message?: string;
};

export async function setChampionshipPilotState(
  _previousState: ChampionshipPilotActionState,
  formData: FormData,
): Promise<ChampionshipPilotActionState> {
  await requireUser();
  const parsed = championshipPilotActionSchema.safeParse({
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
    pilotTeamId = parseChampionshipPilotConfig(process.env)?.teamId ?? null;
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
    return { outcome: "error", message: "Não foi possível confirmar a coorte." };
  }
  if (team.id !== pilotTeamId) {
    return { outcome: "error", message: "Este time não pertence à coorte autorizada." };
  }

  const { data, error } = await supabase.rpc("set_team_feature_flag", {
    requested_team_id: team.id,
    requested_feature: "championships",
    requested_enabled: parsed.data.enabled,
  });
  if (
    error ||
    !data ||
    data.team_id !== team.id ||
    data.feature !== "championships" ||
    data.enabled !== parsed.data.enabled
  ) {
    return {
      outcome: "error",
      message: error?.code === "42501"
        ? "Somente owner ou admin pode alterar o piloto."
        : "Não foi possível alterar o piloto de campeonatos.",
    };
  }

  console.info("championship_pilot.flag_changed", {
    enabled: parsed.data.enabled,
  });
  revalidatePath(`/app/${team.slug}`);
  revalidatePath(`/app/${team.slug}/settings`);
  revalidatePath(`/app/${team.slug}/championships`);
  return {
    outcome: "success",
    message: parsed.data.enabled
      ? "Piloto ativado somente para esta coorte."
      : "Rollback concluído; agenda, partidas e súmulas continuam disponíveis.",
  };
}
