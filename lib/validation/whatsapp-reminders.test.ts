import { describe, expect, it } from "vitest";
import {
  eventReminderSettingsSchema,
  sendEventReminderSchema,
  teamReminderSettingsSchema,
} from "./whatsapp-reminders";

const teamId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";

describe("validação dos lembretes de WhatsApp", () => {
  it("aceita defaults em horas com o primeiro antes do segundo", () => {
    expect(
      teamReminderSettingsSchema.parse({
        teamId,
        teamSlug: "campo-fc",
        firstHours: "72",
        secondHours: "48",
      }),
    ).toMatchObject({ firstHours: 72, secondHours: 48 });
  });

  it("rejeita ordem invertida e horários dentro das últimas 24 horas", () => {
    expect(
      teamReminderSettingsSchema.safeParse({
        teamId,
        teamSlug: "campo-fc",
        firstHours: "48",
        secondHours: "72",
      }).success,
    ).toBe(false);
    expect(
      teamReminderSettingsSchema.safeParse({
        teamId,
        teamSlug: "campo-fc",
        firstHours: "48",
        secondHours: "24",
      }).success,
    ).toBe(false);
  });

  it("permite personalização válida ou retorno à herança", () => {
    expect(
      eventReminderSettingsSchema.safeParse({
        teamId,
        teamSlug: "campo-fc",
        eventId,
        mode: "custom",
        firstHours: "60",
        secondHours: "36",
      }).success,
    ).toBe(true);
    expect(
      eventReminderSettingsSchema.safeParse({
        teamId,
        teamSlug: "campo-fc",
        eventId,
        mode: "inherit",
      }).success,
    ).toBe(true);
  });

  it("exige dois horários na personalização", () => {
    expect(
      eventReminderSettingsSchema.safeParse({
        teamId,
        teamSlug: "campo-fc",
        eventId,
        mode: "custom",
        firstHours: "60",
      }).success,
    ).toBe(false);
  });

  it("exige request id para idempotência do envio", () => {
    expect(
      sendEventReminderSchema.safeParse({
        teamId,
        teamSlug: "campo-fc",
        eventId,
        requestId: crypto.randomUUID(),
      }).success,
    ).toBe(true);
    expect(
      sendEventReminderSchema.safeParse({
        teamId,
        teamSlug: "campo-fc",
        eventId,
        requestId: "repetir",
      }).success,
    ).toBe(false);
  });
});
