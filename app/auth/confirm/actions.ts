"use server";

import { isValidEmailTokenHash } from "@/lib/auth/email-callbacks";
import { safeInternalPath } from "@/lib/security/redirects";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function readFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

export async function confirmEmail(formData: FormData) {
  const tokenHash = readFormValue(formData, "token_hash");
  const type = readFormValue(formData, "type");
  const next = safeInternalPath(readFormValue(formData, "next"));

  if (!isValidEmailTokenHash(tokenHash) || type !== "email") {
    redirect("/auth/error");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });

  redirect(error ? "/auth/error" : next);
}
