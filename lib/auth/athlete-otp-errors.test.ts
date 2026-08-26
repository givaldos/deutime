import {
  athleteLoginAuthErrorMessage,
  athleteRegistrationReturnPath,
} from "@/lib/auth/athlete-otp-errors";
import { describe, expect, it } from "vitest";

describe("erros do login de atleta por OTP", () => {
  it("orienta o primeiro acesso quando o telefone ainda não possui identidade", () => {
    expect(athleteLoginAuthErrorMessage("otp_disabled")).toBe(
      "Este WhatsApp ainda não tem perfil. No link público do seu time, escolha Primeiro acesso.",
    );
  });

  it("preserva mensagens específicas de limite e código inválido", () => {
    expect(athleteLoginAuthErrorMessage("over_sms_send_rate_limit")).toBe(
      "Aguarde um minuto antes de solicitar outro código.",
    );
    expect(athleteLoginAuthErrorMessage("invalid_otp")).toBe(
      "Código inválido ou expirado.",
    );
  });

  it("só oferece retorno quando o login nasceu no cadastro público do time", () => {
    expect(
      athleteRegistrationReturnPath("/t/demo-campo/register"),
    ).toBe("/t/demo-campo/register");
    expect(
      athleteRegistrationReturnPath("/t/demo-campo/cadastro?novo=1"),
    ).toBe("/t/demo-campo/register?novo=1");
    expect(
      athleteRegistrationReturnPath(
        "/t/demo-campo/cadastro?novo=1&next=https://evil.example",
      ),
    ).toBe("/t/demo-campo/register?novo=1");
    expect(
      athleteRegistrationReturnPath("/t/demo--campo/register"),
    ).toBeNull();
    expect(athleteRegistrationReturnPath("/me")).toBeNull();
  });
});
