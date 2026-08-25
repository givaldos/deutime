"use server";

import { requireUser } from "@/lib/auth/dal";
import { passwordUpdateErrorMessage } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";
import { recoveredPasswordSchema } from "@/lib/validation/auth";
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

export type AccountAccessState = {
  outcome?: "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const accountEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

const currentPasswordSchema = z
  .string()
  .min(1, "Informe sua senha atual.")
  .max(128);

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

export async function updateMyAccountEmail(
  _previousState: AccountAccessState,
  formData: FormData,
): Promise<AccountAccessState> {
  const user = await requireUser();
  const parsed = accountEmailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      outcome: "error",
      message: "Revise o novo e-mail.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (parsed.data.email === user.email?.toLowerCase()) {
    return {
      outcome: "error",
      message: "Informe um e-mail diferente do atual.",
      errors: { email: ["O novo e-mail deve ser diferente do atual."] },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email,
  });

  if (error) {
    console.error(JSON.stringify({
      event: "account_email_update",
      outcome: "failed",
      code: error.code,
    }));
    return {
      outcome: "error",
      message:
        error.code === "over_email_send_rate_limit"
          ? "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente."
          : error.code === "email_exists"
            ? "Este e-mail não pode ser usado nesta conta."
            : error.code === "email_address_invalid" ||
                error.code === "validation_failed"
              ? "Informe um endereço de e-mail válido."
              : error.code === "session_expired" ||
                  error.code === "session_not_found"
                ? "Sua sessão expirou. Entre novamente para trocar o e-mail."
                : "Não foi possível solicitar a troca do e-mail agora.",
    };
  }

  console.info(JSON.stringify({
    event: "account_email_update",
    outcome: "confirmation_requested",
  }));
  revalidatePath("/app/profile");
  return {
    outcome: "success",
    message:
      "Solicitação enviada. Confirme a troca pelos e-mails recebidos antes de usar o novo endereço.",
  };
}

export async function updateMyAccountPassword(
  _previousState: AccountAccessState,
  formData: FormData,
): Promise<AccountAccessState> {
  const user = await requireUser();
  const currentPassword = currentPasswordSchema.safeParse(
    formData.get("currentPassword"),
  );
  const nextPassword = recoveredPasswordSchema.safeParse({
    password: formData.get("password"),
    repeatPassword: formData.get("repeatPassword"),
  });

  if (!currentPassword.success || !nextPassword.success) {
    return {
      outcome: "error",
      message: "Revise as senhas informadas.",
      errors: {
        currentPassword: currentPassword.success
          ? undefined
          : currentPassword.error.flatten().formErrors,
        ...(nextPassword.success
          ? {}
          : nextPassword.error.flatten().fieldErrors),
      },
    };
  }

  if (!user.email) {
    return {
      outcome: "error",
      message: "Esta conta não usa acesso por e-mail e senha.",
    };
  }

  const supabase = await createClient();
  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword.data,
  });
  if (verificationError) {
    console.error(JSON.stringify({
      event: "account_password_verification",
      outcome: "failed",
      code: verificationError.code,
    }));
    return {
      outcome: "error",
      message:
        verificationError.code === "invalid_credentials"
          ? "A senha atual está incorreta."
          : "Não foi possível confirmar sua senha atual.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    current_password: currentPassword.data,
    password: nextPassword.data.password,
  });

  if (error) {
    console.error(JSON.stringify({
      event: "account_password_update",
      outcome: "failed",
      code: error.code,
    }));
    return {
      outcome: "error",
      message:
        error.code === "invalid_credentials" ||
        error.code === "reauthentication_not_valid"
          ? "A senha atual está incorreta."
          : error.code === "reauthentication_needed" ||
              error.code === "reauth_nonce_missing"
            ? "Por segurança, confirme novamente sua identidade pelo fluxo de recuperação de senha."
            : passwordUpdateErrorMessage(error.code),
    };
  }

  console.info(JSON.stringify({
    event: "account_password_update",
    outcome: "success",
  }));
  return {
    outcome: "success",
    message: "Senha atualizada com segurança.",
  };
}
