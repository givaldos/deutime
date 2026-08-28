import { describe, expect, it } from "vitest";
import { registrationEmailContent } from "./contract";

describe("conteúdo do aviso de cadastro", () => {
  it("aplica branding, link autenticado e nenhum campo pessoal do atleta", () => {
    const content = registrationEmailContent(
      {
        recipient: "admin@example.test",
        teamName: "Avisos FC",
        teamSlug: "avisos-fc",
      },
      new URL("https://deutime.app"),
    );

    expect(content.subject).toBe("Novo pedido de entrada — Avisos FC");
    expect(content.html).toContain("logo-deutime-email-640-fundo-escuro.png");
    expect(content.html).toContain("https://deutime.app/app/avisos-fc/athletes");
    expect(content.html).toContain("não mostra nome, telefone, e-mail");
    expect(content.html).not.toContain("admin@example.test");
  });

  it("escapa o nome do time antes de montar o HTML", () => {
    const content = registrationEmailContent(
      { recipient: "admin@example.test", teamName: "FC <script>", teamSlug: "fc" },
      new URL("https://deutime.app"),
    );
    expect(content.html).toContain("FC &lt;script&gt;");
    expect(content.html).not.toContain("<script>");
  });

  it("remove quebras de linha do assunto", () => {
    const content = registrationEmailContent(
      { recipient: "admin@example.test", teamName: "Avisos\r\nBcc: invasor", teamSlug: "avisos" },
      new URL("https://deutime.app"),
    );
    expect(content.subject).toBe("Novo pedido de entrada — Avisos Bcc: invasor");
  });
});
