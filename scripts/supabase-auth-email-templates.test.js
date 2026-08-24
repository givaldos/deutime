import { describe, expect, it } from "vitest";

import {
  AUTH_EMAIL_TEMPLATES,
  REQUIRED_EMAIL_BRAND_FRAGMENTS,
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

  it("aplica o branding completo em todos os e-mails enviados", async () => {
    const config = await buildAuthEmailConfig();

    for (const template of AUTH_EMAIL_TEMPLATES) {
      const content = config[template.contentField];

      for (const fragment of REQUIRED_EMAIL_BRAND_FRAGMENTS) {
        expect(content, `${template.path}: ${fragment}`).toContain(fragment);
      }

      expect(content).toContain('<meta name="viewport"');
      expect(content).toContain('alt="DeuTime"');
      expect(content).toContain("{{ .SiteURL }}");
    }
  });

  it("oferece recuperação imediata no aviso de senha alterada", async () => {
    const config = await buildAuthEmailConfig();

    expect(
      config.mailer_templates_password_changed_notification_content,
    ).toContain("{{ .SiteURL }}/auth/forgot-password");
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
