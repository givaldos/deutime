import { TEAM_SLUG_PATTERN } from "@/lib/validation/onboarding";

export function athleteLoginAuthErrorMessage(code?: string) {
  if (code === "over_sms_send_rate_limit" || code === "over_request_rate_limit") {
    return "Aguarde um minuto antes de solicitar outro código.";
  }
  if (code === "otp_expired" || code === "invalid_otp") {
    return "Código inválido ou expirado.";
  }
  if (code === "otp_disabled") {
    return "Este WhatsApp ainda não tem perfil. No link público do seu time, escolha Primeiro acesso.";
  }
  return "Não foi possível entrar. Confira o número usado no cadastro.";
}

export function athleteRegistrationReturnPath(nextPath: string) {
  if (!nextPath.startsWith("/")) return null;

  const url = new URL(nextPath, "https://deutime.local");
  if (url.origin !== "https://deutime.local") return null;

  const match = url.pathname.match(/^\/t\/([^/]+)\/(?:register|cadastro)\/?$/);
  const slug = match?.[1];
  if (!slug || !TEAM_SLUG_PATTERN.test(slug)) return null;

  const suffix = url.searchParams.get("novo") === "1" ? "?novo=1" : "";
  return `/t/${slug}/register${suffix}`;
}
