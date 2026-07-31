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
  return /^\/t\/[^/?#]+\/cadastro(?:[/?#]|$)/.test(nextPath)
    ? nextPath
    : null;
}
