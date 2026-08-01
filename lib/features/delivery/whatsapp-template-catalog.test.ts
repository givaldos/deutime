import { describe, expect, it } from "vitest";
import type { WhatsAppDispatchCommand } from "./dispatch-contract";
import {
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
      event_link: "https://deutime.app/e/example#c=secret",
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
      "3": expect.stringMatching(/^https:\/\/deutime\.app\/e\//),
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
      "3": "https://deutime.app/e/example#c=secret",
    });
  });

  it("adapta o mesmo comando ao template pré-aprovado do Sandbox", () => {
    expect(
      renderTwilioTemplateVariables(command, "sandbox_appointment"),
    ).toEqual({
      "1": "Racha de sexta em 02/08/2030, 19:00",
      "2": "https://deutime.app/e/example#c=secret",
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
