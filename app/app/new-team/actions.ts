"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createTeamSchema } from "@/lib/validation/onboarding";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateTeamState = {
  message?: string;
  errors?: Partial<
    Record<"name" | "slug" | "sportFormat" | "inviteCode", string[]>
  >;
};

export async function createTeam(
  _previousState: CreateTeamState,
  formData: FormData,
): Promise<CreateTeamState> {
  await requireUser();
  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sportFormat: formData.get("sportFormat"),
    inviteCode: formData.get("inviteCode"),
  });

  if (!parsed.success) {
    return {
      message: "Revise os campos indicados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_team_for_current_user", {
    team_name: parsed.data.name,
    team_slug: parsed.data.slug,
    sport_format: parsed.data.sportFormat,
    invite_code: parsed.data.inviteCode,
  });

  if (error) {
    return {
      message:
        error.code === "P0001"
          ? "Código de convite inválido, vencido ou já utilizado. Solicite um novo acesso."
          : error.code === "23505"
            ? "Esse endereço já está em uso. Escolha outra identificação."
            : error.code === "54000"
              ? "Aguarde um minuto antes de criar outro time."
              : error.code === "PGRST202"
                ? "O acesso por convite está sendo atualizado. Recarregue a página em instantes."
                : "Não foi possível criar o time agora. Tente novamente.",
    };
  }

  revalidatePath("/app");
  redirect(`/app/${parsed.data.slug}?created=1`);
}
