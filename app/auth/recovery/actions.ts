"use server";

import {
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryCookieOptions,
} from "@/lib/auth/recovery";
import {
  isValidEmailTokenHash,
  isValidPkceAuthCode,
} from "@/lib/auth/email-callbacks";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function authorizePasswordRecovery(
  exchange: (
    supabase: Awaited<ReturnType<typeof createClient>>,
  ) => Promise<{ userId?: string; failed: boolean }>,
) {
  const supabase = await createClient();
  const result = await exchange(supabase);
  if (result.failed || !result.userId) {
    redirect("/auth/error?reason=recovery");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    PASSWORD_RECOVERY_COOKIE,
    result.userId,
    passwordRecoveryCookieOptions(),
  );
  redirect("/auth/update-password");
}

export async function beginPasswordRecovery(formData: FormData) {
  const tokenHash = formData.get("token_hash");
  const tokenHashValue =
    typeof tokenHash === "string" ? tokenHash : undefined;
  const type = formData.get("type");
  if (
    !isValidEmailTokenHash(tokenHashValue) ||
    type !== "recovery"
  ) {
    redirect("/auth/error?reason=recovery");
  }

  await authorizePasswordRecovery(async (supabase) => {
    const { data, error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHashValue,
    });
    return {
      userId: data.user?.id,
      failed: Boolean(error),
    };
  });
}

export async function beginPkcePasswordRecovery(formData: FormData) {
  const code = formData.get("code");
  const codeValue = typeof code === "string" ? code : undefined;
  if (!isValidPkceAuthCode(codeValue)) {
    redirect("/auth/error?reason=recovery");
  }

  await authorizePasswordRecovery(async (supabase) => {
    const { data, error } =
      await supabase.auth.exchangeCodeForSession(codeValue);
    return {
      userId: data.user?.id,
      failed: Boolean(error),
    };
  });
}
