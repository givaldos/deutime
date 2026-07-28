import {
  cancelEventSchema,
  createAthleteSchema,
  createEventSchema,
  extendEventSeriesSchema,
  legacyCreateEventSchema,
  matchIncidentSchema,
  matchReportSchema,
  removeAthleteSchema,
  updateAthleteSchema,
  updateEventSchema,
} from "./operations";
import { describe, expect, it } from "vitest";

describe("operational validation", () => {
  it("normalizes administrative athlete contact data", () => {
    const parsed = createAthleteSchema.parse({
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      fullName: "  Maria da Silva  ",
      preferredName: "Maria",
      shirtNumber: "10",
      birthDate: "1995-05-12",
      phone: "+55 (11) 99999-9999",
      email: "MARIA@EXAMPLE.TEST",
      publicProfile: false,
      positionCodes: ["MID", "ST"],
    });

    expect(parsed.fullName).toBe("Maria da Silva");
    expect(parsed.phone).toBe("+5511999999999");
    expect(parsed.email).toBe("maria@example.test");
    expect(parsed.shirtNumber).toBe(10);
  });

  it("rejects more than three or duplicated position preferences", () => {
    const base = {
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      fullName: "Maria da Silva",
      publicProfile: false,
    };

    expect(createAthleteSchema.safeParse({ ...base, positionCodes: ["MID", "MID"] }).success).toBe(false);
    expect(createAthleteSchema.safeParse({ ...base, positionCodes: ["GK", "FIXO", "MID", "ST"] }).success).toBe(false);
  });

  it("separates team-owned and player-owned athlete edits", () => {
    const identity = {
      athleteId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      shirtNumber: "8",
      notes: "Paga a mensalidade no dia 10.",
    };

    expect(
      updateAthleteSchema.safeParse({
        ...identity,
        profileOwner: "team",
        fullName: "Maria da Silva",
        preferredName: "Maria",
        birthDate: "1995-05-12",
        phone: "(11) 99999-9999",
        email: "MARIA@EXAMPLE.TEST",
        publicProfile: true,
        positionCodes: ["MID", "ST"],
      }).success,
    ).toBe(true);

    const playerOwned = updateAthleteSchema.safeParse({
      ...identity,
      profileOwner: "player",
    });
    expect(playerOwned.success).toBe(true);
    if (playerOwned.success) {
      expect("fullName" in playerOwned.data).toBe(false);
    }
  });

  it("validates the athlete removal identity", () => {
    expect(
      removeAthleteSchema.safeParse({
        athleteId: "11111111-1111-4111-8111-111111111111",
        teamSlug: "racha-do-bairro",
      }).success,
    ).toBe(true);
    expect(
      removeAthleteSchema.safeParse({
        athleteId: "not-an-id",
        teamSlug: "racha-do-bairro",
      }).success,
    ).toBe(false);
  });

  it("accepts one-off and bounded weekly events", () => {
    const parsed = createEventSchema.safeParse({
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      title: "Racha de quinta",
      kind: "weekly_match",
      organizationMode: "split_teams",
      sportFormat: "society",
      requestId: "33333333-3333-4333-8333-333333333333",
      startsAtLocal: "2030-08-15T20:30",
      durationMinutes: "90",
      deadlineMinutes: "120",
      repeatWeeks: "12",
      opponentName: "",
      venueName: "Arena Central",
      venueAddress: "Rua do Campo, 100",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.repeatWeeks).toBe(12);
  });

  it("rejects malformed civil dates and excessive recurrence", () => {
    const base = {
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      title: "Racha",
      kind: "weekly_match",
      organizationMode: "split_teams",
      sportFormat: "society",
      durationMinutes: 90,
      deadlineMinutes: 120,
    };

    const malformedEvent = createEventSchema.safeParse({
      ...base,
      requestId: "33333333-3333-4333-8333-333333333333",
      startsAtLocal: "15/08/2030 20:30",
      repeatWeeks: 1,
    });

    expect(malformedEvent.success).toBe(false);
    if (!malformedEvent.success) {
      expect(malformedEvent.error.flatten().fieldErrors.startsAtLocal).toContain(
        "Informe uma data e uma hora válidas.",
      );
    }
    expect(
      createEventSchema.safeParse({
        ...base,
        requestId: "33333333-3333-4333-8333-333333333333",
        startsAtLocal: "2030-08-15T20:30",
        repeatWeeks: 53,
      }).success,
    ).toBe(false);
  });

  it("keeps accepting the ISO payload while event control is disabled", () => {
    expect(
      legacyCreateEventSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        teamSlug: "racha-do-bairro",
        title: "Racha legado",
        kind: "weekly_match",
        organizationMode: "split_teams",
        sportFormat: "society",
        startsAtIso: new Date(Date.now() + 86_400_000).toISOString(),
        durationMinutes: 90,
        deadlineMinutes: 120,
        repeatWeeks: 1,
      }).success,
    ).toBe(true);
  });

  it("accepts only the supported recurring event edit scopes", () => {
    const base = {
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      eventId: "22222222-2222-4222-8222-222222222222",
      title: "Racha atualizado",
      kind: "weekly_match",
      organizationMode: "split_teams",
      sportFormat: "society",
      requestId: "33333333-3333-4333-8333-333333333333",
      startsAtLocal: "2030-08-15T20:30",
      durationMinutes: 90,
      deadlineMinutes: 120,
      editScope: "single_event",
    };

    expect(updateEventSchema.safeParse(base).success).toBe(true);
    expect(
      updateEventSchema.safeParse({ ...base, editScope: "entire_series" })
        .success,
    ).toBe(false);
  });

  it("requires an explicit supported event cancellation scope", () => {
    const base = {
      teamId: "10000000-0000-0000-0000-000000000002",
      teamSlug: "racha-do-bairro",
      eventId: "40000000-0000-0000-0000-000000000002",
      requestId: "33333333-3333-4333-8333-333333333333",
      cancelScope: "single_event",
      confirmation: "confirmed",
    };

    expect(cancelEventSchema.safeParse(base).success).toBe(true);
    expect(
      cancelEventSchema.safeParse({
        ...base,
        cancelScope: "entire_series",
      }).success,
    ).toBe(false);
    expect(
      cancelEventSchema.safeParse({
        ...base,
        confirmation: undefined,
      }).success,
    ).toBe(false);
  });

  it("validates a bounded event series extension", () => {
    const base = {
      teamId: "10000000-0000-0000-0000-000000000002",
      teamSlug: "racha-do-bairro",
      eventId: "40000000-0000-0000-0000-000000000002",
      seriesId: "50000000-0000-0000-0000-000000000002",
      requestId: "33333333-3333-4333-8333-333333333334",
      additionalOccurrences: "4",
    };

    expect(extendEventSeriesSchema.parse(base).additionalOccurrences).toBe(4);
    expect(
      extendEventSeriesSchema.safeParse({
        ...base,
        additionalOccurrences: "0",
      }).success,
    ).toBe(false);
    expect(
      extendEventSeriesSchema.safeParse({
        ...base,
        additionalOccurrences: "53",
      }).success,
    ).toBe(false);
  });

  it("validates match reports and optional goal assists", () => {
    const identity = {
      teamSlug: "racha-do-bairro",
      eventId: "22222222-2222-4222-8222-222222222222",
    };

    expect(
      matchReportSchema.safeParse({
        ...identity,
        sideALabel: "Verde",
        sideBLabel: "Branco",
        sideAScore: "3",
        sideBScore: "2",
        notes: "Jogo equilibrado.",
        intent: "finalize",
      }).success,
    ).toBe(true);
    expect(
      matchIncidentSchema.safeParse({
        ...identity,
        kind: "goal",
        athleteId: "33333333-3333-4333-8333-333333333333",
        assistAthleteId: "",
        scoringSide: "1",
        minute: "18",
        notes: "",
      }).success,
    ).toBe(true);
    expect(
      matchIncidentSchema.safeParse({
        ...identity,
        kind: "goal",
        athleteId: "33333333-3333-4333-8333-333333333333",
        scoringSide: "3",
      }).success,
    ).toBe(false);
  });
});
