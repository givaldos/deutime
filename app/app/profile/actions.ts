"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const accountProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
});

export type AccountProfileState = {
  outcome?: "success" | "error";
  message?: string;
  errors?: { displayName?: string[] };
};

export async function updateMyAccountProfile(
  _previousState: AccountProfileState,
  formData: FormData,
): Promise<AccountProfileState> {
  const user = await requireUser();
  const parsed = accountProfileSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return {
      outcome: "error",
      message: "Revise o nome informado.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: displayName, error } = await supabase.rpc(
    "update_my_account_profile",
    { requested_display_name: parsed.data.displayName },
  );

  if (error || !displayName) {
    console.error(JSON.stringify({
      event: "account_profile_update",
      outcome: "failed",
      code: error?.code ?? "empty_result",
    }));
    return {
      outcome: "error",
      message:
        error?.code === "42501"
          ? "Sua sessão expirou. Entre novamente para salvar."
          : "Não foi possível salvar o perfil agora.",
    };
  }

  revalidatePath("/app/profile");
  revalidatePath("/me");
  revalidatePath("/me/perfil");
  revalidatePath("/me/perfil/editar");
  if (playerProfile?.handle) revalidatePath(`/p/${playerProfile.handle}`);

  return {
    outcome: "success",
    message: "Perfil atualizado.",
  };
}
