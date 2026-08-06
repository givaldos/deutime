import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5000;

export type TurnstileVerifyResult = {
  success: boolean;
  errorCodes?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  if (!token || !secret) return { success: false, errorCodes: ["missing-input"] };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    });

    if (!res.ok) return { success: false, errorCodes: ["verify-fetch-failed"] };

    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    return {
      success: data.success === true,
      errorCodes: data["error-codes"],
    };
  } catch {
    return { success: false, errorCodes: ["verify-exception"] };
  } finally {
    clearTimeout(timeout);
  }
}
