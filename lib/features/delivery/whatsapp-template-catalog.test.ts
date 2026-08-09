import { describe, expect, it } from "vitest";
import type { WhatsAppDispatchCommand } from "./dispatch-contract";
import {
  EVENT_CALL_CARD_TEMPLATE_V1,
  EVENT_CALL_TEMPLATE_V1,
  renderTwilioTemplateVariables,
} from "./whatsapp-template-catalog";

const command: WhatsAppDispatchCommand = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  recipient: "+5511999999999",
  template: {
    key: "event_call",
    version: "v1",
    variables: {
      event_title: "Racha de sexta",
      event_starts_at: "2030-08-02T22:00:00.000Z",
      event_timezone: "America/Sao_Paulo",
      // paths sem domínio, conforme exigência da Meta
      event_link: "e/example#c=secret",
      event_media_url: "e/example/convite.png",
    },
  },
  callbackUrl: "https://deutime.app/api/status?t=opaque",
};

describe("catálogo de templates do WhatsApp", () => {
  it("define o template utilitário em português com amostras determinísticas", () => {
    expect(EVENT_CALL_TEMPLATE_V1).toMatchObject({
      key: "event_call",
      version: "v1",
      content: {
        friendly_name: "deutime_event_call_v1",
        language: "pt_BR",
      },
      approval: { name: "deutime_event_call_v1", category: "UTILITY" },
    });
    expect(EVENT_CALL_TEMPLATE_V1.content.variables).toEqual({
      "1": "Treino de sexta",
      "2": "02/08/2030 às 19:00",
      "3": expect.stringMatching(/^e\//),
    });
  });

  it("não inclui resposta, endereço privado ou dados do atleta", () => {
    const serialized = JSON.stringify(EVENT_CALL_TEMPLATE_V1).toLowerCase();
    for (const forbidden of [
      "confirmed",
      "declined",
      "resposta atual",
      "endereço",
      "telefone",
      "nascimento",
      "posição",
      "escalação",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("renderiza três variáveis para o sender próprio no fuso do time", () => {
    expect(renderTwilioTemplateVariables(command, "event_call_v1")).toEqual({
      "1": "Racha de sexta",
      "2": "02/08/2030, 19:00",
      "3": "e/example#c=secret",
    });
  });

  it("define card com imagem no header, botão de URL e footer", () => {
    expect(EVENT_CALL_CARD_TEMPLATE_V1).toMatchObject({
      key: "event_call",
      version: "card_v1",
      content: {
        friendly_name: "deutime_event_call_card_v1",
        language: "pt_BR",
      },
      approval: { name: "deutime_event_call_card_v1", category: "UTILITY" },
    });

    const card = EVENT_CALL_CARD_TEMPLATE_V1.content.types["whatsapp/card"];

    // body usa negrito do WhatsApp e as variáveis {{1}} e {{2}}
    expect(card.body).toContain("{{1}}");
    expect(card.body).toContain("{{2}}");
    expect(card.body).toContain("*Fala Craque*");

    // header é imagem via variável {{4}}
    expect(card.media).toEqual(["https://deutime.app/{{4}}"]);

    // footer fixo
    expect(card.footer).toContain("Mudou de idéia");

    // botão de URL com variável {{3}}
    expect(card.actions).toEqual([
      {
        type: "URL",
        title: "Clique para Confirmar",
        url: "https://deutime.app/{{3}}",
      },
    ]);

    // amostras: {{3}} é path do link, {{4}} é path da imagem
    expect(EVENT_CALL_CARD_TEMPLATE_V1.content.variables["3"]).toMatch(/^e\//);
    expect(EVENT_CALL_CARD_TEMPLATE_V1.content.variables["4"]).toMatch(
      /^e\/.+\/convite\.png$/,
    );
  });

  it("renderiza nome, data, link e mídia separados para o card", () => {
    expect(renderTwilioTemplateVariables(command, "event_call_card_v1")).toEqual({
      "1": "Racha de sexta",
      "2": "02/08/2030, 19:00",
      "3": "e/example#c=secret",
      "4": "e/example/convite.png",
    });
  });

  it.each([
    "event_call_card_v2",
    "event_call_card_first_remember_v2",
    "event_call_card_last_remember_v2",
  ] as const)("mantém o contrato de quatro variáveis no perfil %s", (profile) => {
    expect(renderTwilioTemplateVariables(command, profile)).toEqual({
      "1": "Racha de sexta",
      "2": "02/08/2030, 19:00",
      "3": "e/example#c=secret",
      "4": "e/example/convite.png",
    });
  });

  it("adapta o mesmo comando ao template pré-aprovado do Sandbox", () => {
    expect(
      renderTwilioTemplateVariables(command, "sandbox_appointment"),
    ).toEqual({
      "1": "Racha de sexta em 02/08/2030, 19:00",
      "2": "e/example#c=secret",
    });
  });

  it("preserva o ISO como fallback compatível quando o schema N-1 não tem fuso", () => {
    const variables = { ...command.template.variables };
    delete variables.event_timezone;
    const withoutTimezone = {
      ...command,
      template: {
        ...command.template,
        variables,
      },
    };
    expect(
      renderTwilioTemplateVariables(withoutTimezone, "event_call_v1")["2"],
    ).toBe("2030-08-02T22:00:00.000Z");
  });
});
