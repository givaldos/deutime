"use server";

import { requireUser } from "@/lib/auth/dal";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import {
  playerAttendanceSchema,
  playerProfileSchema,
} from "@/lib/validation/operations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type PlayerProfileState = {
  status?: "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const playerPhotoSchema = z.object({
  storagePath: z
    .string()
    .min(80)
    .max(180)
    .regex(
      /^[0-9a-f-]{36}\/profile\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/,
    ),
});

export type PlayerPhotoActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

async function revalidatePlayerPhotoPages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const [{ data: profile }, { data: links }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("handle")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("list_my_player_team_links"),
  ]);

  revalidatePath("/me");
  revalidatePath("/me/perfil");
  revalidatePath("/me/perfil/editar");
  if (profile?.handle) revalidatePath(`/p/${profile.handle}`);
  for (const link of links ?? []) {
    if (link.team_slug) revalidatePath(`/t/${link.team_slug}`);
  }
}

export async function registerMyPlayerPhoto(
  formData: FormData,
): Promise<PlayerPhotoActionResult> {
  const user = await requireUser();
  const parsed = playerPhotoSchema.safeParse({
    storagePath: formData.get("storagePath"),
  });
  if (
    !parsed.success ||
    !parsed.data.storagePath.startsWith(`${user.id}/profile/`)
  ) {
    return { ok: false, message: "Não foi possível validar essa foto." };
  }

  const supabase = await createClient();
  const { data: previousPath, error } = await supabase.rpc(
    "replace_my_player_photo",
    { requested_storage_path: parsed.data.storagePath },
  );
  if (error) {
    await supabase.storage
      .from("athlete_avatars")
      .remove([parsed.data.storagePath]);
    return {
      ok: false,
      message:
        error.code === "42501"
          ? "Sua sessão expirou. Entre novamente para trocar a foto."
          : "Não foi possível salvar a foto agora.",
    };
  }

  if (
    typeof previousPath === "string" &&
    previousPath !== parsed.data.storagePath
  ) {
    await supabase.storage.from("athlete_avatars").remove([previousPath]);
  }
  await revalidatePlayerPhotoPages(supabase, user.id);
  return { ok: true, message: "Foto de perfil atualizada." };
}

export async function removeMyPlayerPhoto(): Promise<PlayerPhotoActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: previousPath, error } = await supabase.rpc(
    "remove_my_player_photo",
  );
  if (error) {
    return {
      ok: false,
      message:
        error.code === "42501"
          ? "Sua sessão expirou. Entre novamente para remover a foto."
          : "Não foi possível remover a foto agora.",
    };
  }

  if (typeof previousPath === "string") {
    await supabase.storage.from("athlete_avatars").remove([previousPath]);
  }
  await revalidatePlayerPhotoPages(supabase, user.id);
  return { ok: true, message: "Foto de perfil removida." };
}

export async function updateMyPlayerProfile(
  _previousState: PlayerProfileState,
  formData: FormData,
): Promise<PlayerProfileState> {
  const user = await requireUser();
  const parsed = playerProfileSchema.safeParse({
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
    preferredName: formData.get("preferredName"),
    bio: formData.get("bio"),
    isPublic: formData.get("isPublic") === "on",
    fieldPositions: formData.getAll("fieldPositions"),
    societyPositions: formData.getAll("societyPositions"),
    futsalPositions: formData.getAll("futsalPositions"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos indicados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: existingProfile } = await supabase
    .from("player_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: handle, error } = await supabase.rpc("update_my_player_profile", {
    requested_handle: parsed.data.handle,
    requested_display_name: parsed.data.displayName,
    requested_preferred_name: parsed.data.preferredName ?? "",
    requested_bio: parsed.data.bio ?? "",
    requested_is_public: parsed.data.isPublic,
    field_positions: parsed.data.fieldPositions,
    society_positions: parsed.data.societyPositions,
    futsal_positions: parsed.data.futsalPositions,
  });

  if (error || !handle) {
    return {
      status: "error",
      message:
        error?.code === "23505"
          ? "Este endereço público já está em uso. Escolha outro."
          : error?.code === "54000"
            ? "O endereço público só pode ser alterado uma vez a cada 30 dias."
            : "Não foi possível salvar o perfil agora.",
    };
  }

  revalidatePath("/me");
  revalidatePath("/me/perfil");
  revalidatePath("/me/perfil/editar");
  if (existingProfile?.handle && existingProfile.handle !== handle) {
    revalidatePath(`/p/${existingProfile.handle}`);
  }
  revalidatePath(`/p/${handle}`);
  redirect("/me/perfil?saved=1");
}

export async function respondToEventAsPlayer(formData: FormData) {
  await requireUser();
  const parsed = playerAttendanceSchema.safeParse({
    eventId: formData.get("eventId"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect("/me/agenda?attendance=error");

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_event_as_player", {
    requested_event_id: parsed.data.eventId,
    response_status: parsed.data.status,
  });
  if (error) {
    redirect("/me/agenda?attendance=error");
  }
  revalidatePath("/me");
  revalidatePath("/me/agenda");
  redirect("/me/agenda?attendance=updated");
}

const sportsActivityConsentSchema = z.object({
  athleteId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  granted: z.enum(["true", "false"]).transform((value) => value === "true"),
  requestId: z.string().uuid(),
});

export async function updateMySportsActivityConsent(formData: FormData) {
  await requireUser();
  const parsed = sportsActivityConsentSchema.safeParse({
    athleteId: formData.get("athleteId"),
    granted: formData.get("granted"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) redirect("/me/perfil/editar?consent=error");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_public_sports_activity_consent", {
    requested_athlete_id: parsed.data.athleteId,
    requested_granted: parsed.data.granted,
    requested_terms_version: "r07-v1",
    request_id: parsed.data.requestId,
  });
  if (error) redirect("/me/perfil/editar?consent=error");

  revalidatePath("/me/perfil");
  revalidatePath("/me/perfil/editar");
  redirect(`/me/perfil/editar?consent=${parsed.data.granted ? "granted" : "revoked"}`);
}

const recognitionSummaryConsentSchema = z.object({
  athleteId: z.string().uuid(),
  granted: z.enum(["true", "false"]).transform((value) => value === "true"),
  requestId: z.string().uuid(),
});

export async function updateMyRecognitionSummaryConsent(formData: FormData) {
  const user = await requireUser();
  const parsed = recognitionSummaryConsentSchema.safeParse({
    athleteId: formData.get("athleteId"),
    granted: formData.get("granted"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) {
    redirect("/me/perfil/editar?recognitionConsent=error");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "set_public_recognition_summary_consent",
    {
      requested_athlete_id: parsed.data.athleteId,
      requested_granted: parsed.data.granted,
      requested_terms_version: "r10-v1",
      request_id: parsed.data.requestId,
    },
  );
  if (error) redirect("/me/perfil/editar?recognitionConsent=error");

  const { data: profile } = await supabase
    .from("player_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  revalidatePath("/me/perfil");
  revalidatePath("/me/perfil/editar");
  if (profile?.handle) {
    revalidatePath(`/p/${profile.handle}`);
  } else {
    revalidatePath("/p/[handle]", "page");
  }
  redirect(
    `/me/perfil/editar?recognitionConsent=${parsed.data.granted ? "granted" : "revoked"}`,
  );
}

const lifecycleCommandSchema = z.object({
  relationshipId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  nextOwnerId: z.string().uuid().optional(),
  requestId: z.string().uuid(),
});

const destructiveLifecycleSchema = lifecycleCommandSchema.extend({
  password: z.string().max(128),
  confirmation: z.string().trim().min(1).max(100),
});

function lifecycleRedirect(result: string): never {
  redirect(`/me?relationship=${result}#vinculos`);
}

export async function withdrawMyTeamRequest(formData: FormData) {
  await requireUser();
  const parsed = lifecycleCommandSchema.safeParse({
    relationshipId: formData.get("relationshipId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success || !parsed.data.relationshipId) {
    lifecycleRedirect("unavailable");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_my_team_request", {
    requested_athlete_id: parsed.data.relationshipId,
    request_id: parsed.data.requestId,
  });
  if (error) lifecycleRedirect("unavailable");
  revalidatePath("/me");
  lifecycleRedirect("withdrawn");
}

export async function declineMyTeamInvitation(formData: FormData) {
  await requireUser();
  const parsed = lifecycleCommandSchema.safeParse({
    relationshipId: formData.get("relationshipId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success || !parsed.data.relationshipId) {
    lifecycleRedirect("unavailable");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_my_team_invitation", {
    requested_invitation_id: parsed.data.relationshipId,
    request_id: parsed.data.requestId,
  });
  if (error) lifecycleRedirect("unavailable");
  revalidatePath("/me");
  revalidatePath("/app");
  lifecycleRedirect("declined");
}

export async function leaveMyTeam(formData: FormData) {
  await requireUser();
  const parsed = lifecycleCommandSchema.safeParse({
    teamId: formData.get("teamId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success || !parsed.data.teamId) lifecycleRedirect("unavailable");
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_my_team", {
    requested_team_id: parsed.data.teamId,
    request_id: parsed.data.requestId,
  });
  if (error) {
    lifecycleRedirect(error.code === "23514" ? "last-owner" : "unavailable");
  }
  revalidatePath("/me");
  revalidatePath("/app");
  lifecycleRedirect("left");
}

export async function transferMyTeamOwnership(formData: FormData) {
  await requireUser();
  const parsed = lifecycleCommandSchema.safeParse({
    teamId: formData.get("teamId"),
    nextOwnerId: formData.get("nextOwnerId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success || !parsed.data.teamId || !parsed.data.nextOwnerId) {
    lifecycleRedirect("unavailable");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_my_team_ownership", {
    requested_team_id: parsed.data.teamId,
    requested_next_owner_id: parsed.data.nextOwnerId,
    request_id: parsed.data.requestId,
  });
  if (error) lifecycleRedirect("unavailable");
  revalidatePath("/me");
  revalidatePath("/app");
  lifecycleRedirect("transferred");
}

async function issueLifecycleAuthorization(input: {
  userId: string;
  requestId: string;
  purpose: "close_team" | "close_account";
  teamId?: string;
  password: string;
  captchaToken?: string;
}) {
  const supabase = await createClient();
  const { data: authUser, error: userError } = await supabase.auth.getUser();
  if (userError || authUser.user?.id !== input.userId) return false;

  if (authUser.user.email) {
    if (!input.password) return false;
    const { error } = await supabase.auth.signInWithPassword({
      email: authUser.user.email,
      password: input.password,
      options: { captchaToken: input.captchaToken },
    });
    if (error) return false;
  } else {
    const { data } = await supabase.auth.getClaims();
    const issuedAt = Number(data?.claims?.iat ?? 0);
    if (!issuedAt || Date.now() / 1000 - issuedAt > 5 * 60) return false;
  }

  const privileged = createPrivilegedClient();
  const { error } = await privileged.rpc("issue_lifecycle_authorization", {
    requested_user_id: input.userId,
    request_id: input.requestId,
    requested_purpose: input.purpose,
    requested_team_id: input.teamId,
  });
  return !error;
}

export async function closeMyTeam(formData: FormData) {
  const user = await requireUser();
  const parsed = destructiveLifecycleSchema.safeParse({
    teamId: formData.get("teamId"),
    requestId: formData.get("requestId"),
    password: formData.get("password") ?? "",
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success || !parsed.data.teamId) lifecycleRedirect("unavailable");
  const authorized = await issueLifecycleAuthorization({
    userId: user.id,
    requestId: parsed.data.requestId,
    purpose: "close_team",
    teamId: parsed.data.teamId,
    password: parsed.data.password,
    captchaToken:
      formData.get("cf-turnstile-response")?.toString() || undefined,
  });
  if (!authorized) lifecycleRedirect("reauthentication");

  const supabase = await createClient();
  const { error } = await supabase.rpc("close_my_team", {
    requested_team_id: parsed.data.teamId,
    requested_team_name: parsed.data.confirmation,
    request_id: parsed.data.requestId,
  });
  if (error) {
    lifecycleRedirect(error.code === "22023" ? "name-mismatch" : "unavailable");
  }
  revalidatePath("/me");
  revalidatePath("/app");
  lifecycleRedirect("team-closed");
}

export async function closeMyAccount(formData: FormData) {
  const user = await requireUser();
  const parsed = destructiveLifecycleSchema.safeParse({
    requestId: formData.get("requestId"),
    password: formData.get("password") ?? "",
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success || parsed.data.confirmation !== "ENCERRAR") {
    lifecycleRedirect("account-confirmation");
  }
  const authorized = await issueLifecycleAuthorization({
    userId: user.id,
    requestId: parsed.data.requestId,
    purpose: "close_account",
    password: parsed.data.password,
    captchaToken:
      formData.get("cf-turnstile-response")?.toString() || undefined,
  });
  if (!authorized) lifecycleRedirect("reauthentication");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("begin_my_account_closure", {
    request_id: parsed.data.requestId,
  });
  if (error) {
    lifecycleRedirect(error.code === "23514" ? "last-owner" : "unavailable");
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as { paths?: unknown })
      : {};
  const paths = Array.isArray(payload.paths)
    ? payload.paths.filter((path): path is string => typeof path === "string")
    : [];
  const privileged = createPrivilegedClient();
  let storageErrorCode: string | undefined;
  if (paths.length) {
    const { error: storageError } = await privileged.storage
      .from("athlete_avatars")
      .remove(paths);
    storageErrorCode = storageError
      ? normalizedAuthError(storageError.name || "storage_remove_failed")
      : undefined;
  }
  const { error: authError } = await privileged.auth.admin.deleteUser(
    user.id,
    true,
  );
  await privileged.rpc("complete_account_closure", {
    requested_request_id: parsed.data.requestId,
    requested_error_code: storageErrorCode ??
      (authError ? normalizedAuthError(authError.code) : undefined),
  });
  await supabase.auth.signOut({ scope: "global" });
  redirect(`/auth/login?account=${authError || storageErrorCode ? "closing" : "closed"}`);
}

function normalizedAuthError(code?: string) {
  const normalized = (code ?? "auth_provider_failed")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 80);
  return normalized.length >= 2 ? normalized : "auth_provider_failed";
}
