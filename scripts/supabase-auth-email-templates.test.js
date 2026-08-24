import { describe, expect, it } from "vitest";

import {
  buildAuthEmailConfig,
  changedAuthEmailConfig,
} from "./supabase-auth-email-templates.mjs";

describe("configuração dos e-mails de autenticação", () => {
  it("publica recuperação com token hash e confirmação humana", async () => {
    const config = await buildAuthEmailConfig();
    const recovery = config.mailer_templates_recovery_content;

    expect(recovery).toContain("{{ .TokenHash }}");
    expect(recovery).toContain("/auth/recovery?token_hash=");
    expect(recovery).toContain("type=recovery");
    expect(recovery).not.toContain("{{ .ConfirmationURL }}");
  });

  it("envia somente os campos que estão diferentes", () => {
    expect(
      changedAuthEmailConfig(
        { subject: "igual", content: "antigo", preserved: true },
        { subject: "igual", content: "novo" },
      ),
    ).toEqual({ content: "novo" });
  });
});
