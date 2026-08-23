"use server";

import { requireUser } from "@/lib/auth/dal";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env/public";
import { recognitionPilotTeamSlug } from "@/lib/features/recognition/pilot-cohort";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import {
  recognitionPilotActionSchema,
  recognitionPilotSeedSchema,
} from "@/lib/validation/recognition-pilot";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

export type RecognitionPilotActionState = {
  outcome?: "success" | "error";
  message?: string;
};

export type RecognitionPilotSeedState = RecognitionPilotActionState;

const syntheticPhone = "+15550100010";
const syntheticEmail = "r10-pilot-athlete@example.test";
const syntheticUserTag = "r10_recognition_pilot_v1";

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

export async function prepareRecognitionPilotAthlete(
  _previousState: RecognitionPilotSeedState,
  formData: FormData,
): Promise<RecognitionPilotSeedState> {
  const user = await requireUser();
  const parsed = recognitionPilotSeedSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success || parsed.data.teamSlug !== recognitionPilotTeamSlug) {
    return {
      outcome: "error",
      message: "Confirme a preparação da coorte sintética.",
    };
  }

  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, slug")
    .eq("slug", parsed.data.teamSlug)
    .maybeSingle();
  if (teamError || !team || team.slug !== recognitionPilotTeamSlug) {
    return { outcome: "error", message: "A coorte sintética não foi encontrada." };
  }
  const { data: membership, error: membershipError } = await supabase
    .from("team_memberships")
    .select("role, status")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (
    membershipError ||
    !membership ||
    !["owner", "admin"].includes(membership.role)
  ) {
    return { outcome: "error", message: "Somente owner ou admin pode preparar o piloto." };
  }

  const before = await readPilotHealth(team.id);
  if (!before?.recognition_enabled || before.reconstruction_mismatches !== 0) {
    return { outcome: "error", message: "A sonda não autorizou os dados sintéticos." };
  }

  const privileged = createPrivilegedClient();
  const password = `R10!${randomBytes(24).toString("base64url")}`;
  const created = await privileged.auth.admin.createUser({
    phone: syntheticPhone,
    email: syntheticEmail,
    password,
    phone_confirm: true,
    email_confirm: true,
    user_metadata: { pilot_tag: syntheticUserTag },
  });
  let syntheticUser = created.data.user;
  if (!syntheticUser) {
    for (let page = 1; page <= 100 && !syntheticUser; page += 1) {
      const listed = await privileged.auth.admin.listUsers({ page, perPage: 1_000 });
      if (listed.error) break;
      syntheticUser = listed.data.users.find(
        (candidate) => candidate.user_metadata?.pilot_tag === syntheticUserTag,
      ) ?? null;
      if (listed.data.users.length < 1_000) break;
    }
  }
  if (!syntheticUser) {
    return { outcome: "error", message: "Não foi possível preparar a identidade sintética." };
  }
  const updated = await privileged.auth.admin.updateUserById(syntheticUser.id, {
    phone: syntheticPhone,
    email: syntheticEmail,
    password,
    phone_confirm: true,
    email_confirm: true,
    user_metadata: { pilot_tag: syntheticUserTag },
  });
  if (updated.error) {
    return { outcome: "error", message: "Não foi possível renovar a identidade sintética." };
  }

  const publicEnv = getPublicEnv();
  const athleteClient = createStatelessClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const signed = await athleteClient.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });
  if (signed.error) {
    const generated = await privileged.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });
    const tokenHash = generated.data.properties?.hashed_token;
    if (generated.error || !tokenHash) {
      console.info("recognition_pilot.synthetic_auth_failed", {
        stage: "generate_link",
        code: generated.error?.code ?? signed.error.code,
      });
      return { outcome: "error", message: "A identidade sintética não pôde iniciar a jornada." };
    }
    const verified = await athleteClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (verified.error) {
      console.info("recognition_pilot.synthetic_auth_failed", {
        stage: "verify_link",
        code: verified.error.code,
      });
      return { outcome: "error", message: "A identidade sintética não pôde iniciar a jornada." };
    }
  }
  if (signed.error && !(await athleteClient.auth.getSession()).data.session) {
    return { outcome: "error", message: "A identidade sintética não pôde iniciar a jornada." };
  }
  const registration = await athleteClient.rpc(
    "complete_verified_athlete_registration",
    {
      team_slug: recognitionPilotTeamSlug,
      full_name: "Atleta Sintético R10",
      preferred_name: "Sintético",
      birth_date: "",
      accepts_privacy_terms: true,
      accepts_whatsapp: false,
      position_codes: ["ST"],
    },
  );
  if (registration.error || !registration.data) {
    return { outcome: "error", message: "O cadastro sintético não foi concluído." };
  }
  const profile = await athleteClient.rpc("update_my_player_profile", {
    requested_handle: "r10-sintetico",
    requested_display_name: "Atleta Sintético R10",
    requested_preferred_name: "Sintético",
    requested_bio: "Perfil exclusivamente sintético do piloto R10.",
    requested_is_public: true,
    field_positions: [],
    society_positions: ["ST"],
    futsal_positions: [],
  });
  if (profile.error || profile.data !== "r10-sintetico") {
    return { outcome: "error", message: "O perfil público sintético não foi preparado." };
  }
  const status = await supabase
    .from("athletes")
    .select("status")
    .eq("id", registration.data)
    .maybeSingle();
  if (status.error || !status.data) {
    return { outcome: "error", message: "O vínculo sintético não pôde ser confirmado." };
  }
  if (status.data.status === "pending") {
    const reviewed = await supabase.rpc("review_athlete_registration", {
      requested_athlete_id: registration.data,
      decision: "approve",
    });
    if (reviewed.error || reviewed.data !== "active") {
      return { outcome: "error", message: "O vínculo sintético não pôde ser aprovado." };
    }
  } else if (status.data.status !== "active") {
    return { outcome: "error", message: "O vínculo sintético está indisponível." };
  }

  const matchCapability = await supabase.rpc("set_team_feature_flag", {
    requested_team_id: team.id,
    requested_feature: "event_matches",
    requested_enabled: true,
  });
  if (
    matchCapability.error ||
    !matchCapability.data ||
    matchCapability.data.team_id !== team.id ||
    matchCapability.data.feature !== "event_matches" ||
    matchCapability.data.enabled !== true
  ) {
    return { outcome: "error", message: "A súmula por partida não pôde ser habilitada." };
  }

  const after = await readPilotHealth(team.id);
  if (!after?.recognition_enabled || after.reconstruction_mismatches !== 0) {
    return { outcome: "error", message: "A pós-sonda não confirmou a coorte sintética." };
  }

  console.info("recognition_pilot.synthetic_athlete_ready", {
    ready: true,
    event_matches_enabled: true,
  });
  revalidatePath(`/app/${team.slug}`);
  revalidatePath(`/app/${team.slug}/settings`);
  revalidatePath(`/app/${team.slug}/athletes`);
  return {
    outcome: "success",
    message: "Atleta e perfil sintéticos prontos para os fatos esportivos.",
  };
}
