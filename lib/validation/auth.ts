import { z } from "zod";

// Espelha password_requirements = "lower_upper_letters_digits_symbols" do Supabase Auth.
const passwordComplexity = z
  .string()
  .min(12, "A senha deve ter pelo menos 12 caracteres.")
  .max(128)
  .refine((v) => /[a-z]/.test(v), "A senha deve conter pelo menos uma letra minúscula.")
  .refine((v) => /[A-Z]/.test(v), "A senha deve conter pelo menos uma letra maiúscula.")
  .refine((v) => /[0-9]/.test(v), "A senha deve conter pelo menos um número.")
  .refine((v) => /[^a-zA-Z0-9]/.test(v), "A senha deve conter pelo menos um caractere especial.");

export const recoveredPasswordSchema = z
  .object({
    password: passwordComplexity,
    repeatPassword: passwordComplexity,
  })
  .refine((value) => value.password === value.repeatPassword, {
    message: "As senhas não coincidem.",
    path: ["repeatPassword"],
  });
