import type { CookieOptions } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";

/**
 * Atributos aplicados aos cookies de sessão do Supabase.
 *
 * `secure` segue o protocolo da URL pública: em produção (https) os cookies
 * de autenticação nunca trafegam em texto claro; no desenvolvimento local
 * (http) o flag é desligado para não quebrar o login.
 *
 * `httpOnly` permanece no default da biblioteca (`false`) porque o client de
 * navegador precisa ler os cookies para renovar a sessão; a compensação é o
 * CSP com nonce + `strict-dynamic` e a ausência de `innerHTML` com dados do
 * usuário.
 */
export function getAuthCookieOptions(): CookieOptions {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  return {
    path: "/",
    sameSite: "lax",
    secure: NEXT_PUBLIC_SUPABASE_URL.startsWith("https://"),
  };
}
