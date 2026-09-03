"use server";

import { requireUser } from "@/lib/auth/dal";
import { parseProfessionalSchedulingPilotConfig } from "@/lib/features/professional-scheduling/pilot-config";
import { createClient } from "@/lib/supabase/server";
import { professionalSchedulingPilotActionSchema } from "@/lib/validation/professional-scheduling-pilot";
import { revalidatePath } from "next/cache";

export type ProfessionalSchedulingPilotActionState = {
  outcome?: "success" | "error";
  message?: string;
};

export async function setProfessionalSchedulingPilotState(
  _previousState: ProfessionalSchedulingPilotActionState,
  formData: FormData,
): Promise<ProfessionalSchedulingPilotActionState> {
  await requireUser();
  const parsed = professionalSchedulingPilotActionSchema.safeParse({
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
    pilotTeamId =
      parseProfessionalSchedulingPilotConfig(process.env)?.teamId ?? null;
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

  const { data, error } = await supabase.rpc("set_professional_scheduling_pilot_state", {
    requested_team_id: team.id,
    requested_enabled: parsed.data.enabled,
  });
  if (
    error ||
    !data ||
    data.team_id !== team.id ||
    data.feature !== "professional_scheduling" ||
    data.enabled !== parsed.data.enabled
  ) {
    return {
      outcome: "error",
      message: error?.code === "42501"
        ? "Somente owner ou admin pode alterar o piloto."
        : error?.code === "55000"
          ? "Configure e salve duas equipes padrão antes de ativar o piloto."
        : "Não foi possível alterar o piloto da agenda profissional.",
    };
  }

  console.info("professional_scheduling_pilot.flag_changed", {
    enabled: parsed.data.enabled,
  });
  revalidatePath(`/app/${team.slug}`);
  revalidatePath(`/app/${team.slug}/settings`);
  revalidatePath(`/app/${team.slug}/events`);
  revalidatePath(`/app/${team.slug}/events/pending`);
  revalidatePath(`/app/${team.slug}/championships`);
  return {
    outcome: "success",
    message: parsed.data.enabled
      ? "Piloto ativado somente para esta coorte. Observe a sonda antes de ampliar."
      : "Rollback concluído; eventos, campeonatos e decisões foram preservados.",
  };
}
