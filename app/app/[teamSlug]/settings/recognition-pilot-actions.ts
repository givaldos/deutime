"use server";

import { requireUser } from "@/lib/auth/dal";
import { recognitionPilotTeamSlug } from "@/lib/features/recognition/pilot-cohort";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import { recognitionPilotActionSchema } from "@/lib/validation/recognition-pilot";
import { revalidatePath } from "next/cache";

export type RecognitionPilotActionState = {
  outcome?: "success" | "error";
  message?: string;
};

type RecognitionPilotHealth = {
  recognition_enabled: boolean;
  activation_captured: boolean;
  projected_cards: number;
  public_cards: number;
  reconstruction_mismatches: number;
};

async function readPilotHealth(teamId: string): Promise<RecognitionPilotHealth | null> {
  const { data, error } = await createPrivilegedClient().rpc(
    "get_recognition_pilot_health",
    { requested_team_id: teamId },
  );
  if (error || !Array.isArray(data) || data.length !== 1) return null;
  const [row] = data;
  if (!row) return null;
  return {
    recognition_enabled: row.recognition_enabled,
    activation_captured: row.activation_captured,
    projected_cards: Number(row.projected_cards),
    public_cards: Number(row.public_cards),
    reconstruction_mismatches: Number(row.reconstruction_mismatches),
  };
}

export async function setRecognitionPilotState(
  _previousState: RecognitionPilotActionState,
  formData: FormData,
): Promise<RecognitionPilotActionState> {
  await requireUser();

  const parsed = recognitionPilotActionSchema.safeParse({
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
  if (parsed.data.teamSlug !== recognitionPilotTeamSlug) {
    return {
      outcome: "error",
      message: "Este time não pertence à coorte autorizada.",
    };
  }

  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, slug")
    .eq("slug", parsed.data.teamSlug)
    .maybeSingle();
  if (teamError || !team || team.slug !== recognitionPilotTeamSlug) {
    return {
      outcome: "error",
      message: "Não foi possível confirmar a coorte sintética.",
    };
  }

  const before = await readPilotHealth(team.id);
  if (
    !before ||
    before.reconstruction_mismatches !== 0 ||
    (parsed.data.enabled && (
      before.recognition_enabled ||
      before.projected_cards !== 0 ||
      before.public_cards !== 0
    ))
  ) {
    return {
      outcome: "error",
      message: "A pré-sonda não autorizou a alteração do piloto.",
    };
  }

  const { data, error } = await supabase.rpc("set_team_feature_flag", {
    requested_team_id: team.id,
    requested_feature: "recognition",
    requested_enabled: parsed.data.enabled,
  });
  if (
    error ||
    !data ||
    data.team_id !== team.id ||
    data.feature !== "recognition" ||
    data.enabled !== parsed.data.enabled
  ) {
    return {
      outcome: "error",
      message:
        error?.code === "42501"
          ? "Somente owner ou admin pode alterar o piloto."
          : "Não foi possível alterar o piloto de reconhecimentos.",
    };
  }


  const after = await readPilotHealth(team.id);
  const verified = after &&
    after.recognition_enabled === parsed.data.enabled &&
    after.reconstruction_mismatches === 0 &&
    (parsed.data.enabled
      ? after.activation_captured
      : after.projected_cards === 0 && after.public_cards === 0);
  if (!verified) {
    if (parsed.data.enabled) {
      await supabase.rpc("set_team_feature_flag", {
        requested_team_id: team.id,
        requested_feature: "recognition",
        requested_enabled: false,
      });
    }
    return {
      outcome: "error",
      message: parsed.data.enabled
        ? "A pós-sonda falhou e a ativação foi revertida."
        : "A pós-sonda não confirmou o rollback.",
    };
  }

  console.info("recognition_pilot.flag_changed", {
    enabled: parsed.data.enabled,
  });
  revalidatePath(`/app/${team.slug}`);
  revalidatePath(`/app/${team.slug}/settings`);
  revalidatePath("/me/reconhecimentos");

  return {
    outcome: "success",
    message: parsed.data.enabled
      ? "Piloto ativado somente para esta coorte sintética."
      : "Rollback concluído; os fatos esportivos foram preservados.",
  };
}
