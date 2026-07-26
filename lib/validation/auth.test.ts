import { describe, expect, it } from "vitest";
import { recoveredPasswordSchema } from "./auth";

describe("recoveredPasswordSchema", () => {
  it("accepts a password meeting all complexity requirements", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "Dev@2026!segura",
      repeatPassword: "Dev@2026!segura",
    }).success).toBe(true);
  });

  it("rejects passwords shorter than 12 characters", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "Dev@1!",
      repeatPassword: "Dev@1!",
    }).success).toBe(false);
  });

  it("rejects passwords without uppercase letters", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "dev@2026!segura",
      repeatPassword: "dev@2026!segura",
    }).success).toBe(false);
  });

  it("rejects passwords without lowercase letters", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "DEV@2026!SEGURA",
      repeatPassword: "DEV@2026!SEGURA",
    }).success).toBe(false);
  });

  it("rejects passwords without digits", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "Dev@!seguraSenha",
      repeatPassword: "Dev@!seguraSenha",
    }).success).toBe(false);
  });

  it("rejects passwords without special characters", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "Dev2026seguraSen",
      repeatPassword: "Dev2026seguraSen",
    }).success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "Dev@2026!segura",
      repeatPassword: "Dev@2026!outra",
    }).success).toBe(false);
  });
});
