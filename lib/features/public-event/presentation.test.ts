import { describe, expect, it } from "vitest";

import {
  formatPublicEventDate,
  formatPublicEventTime,
  formatPublicEventTimeZone,
  isPublicEventContractUnavailable,
  isPublicEventId,
  publicEventStatusPresentation,
} from "./presentation";

describe("public event presentation", () => {
  it("accepts only canonical UUIDs supported by the public route", () => {
    expect(isPublicEventId("b4000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isPublicEventId("B4000000-0000-4000-8000-000000000001")).toBe(false);
    expect(isPublicEventId("b4000000-0000-0000-0000-000000000001")).toBe(false);
    expect(isPublicEventId("../evento")).toBe(false);
  });

  it("formats date and time in the authoritative team timezone", () => {
    const instant = "2026-07-29T00:30:00.000Z";

    expect(formatPublicEventDate(instant, "America/Sao_Paulo")).toContain(
      "terça-feira",
    );
    expect(formatPublicEventTime(instant, "America/Sao_Paulo")).toBe("21:30");
    expect(formatPublicEventTime(instant, "America/Recife")).toBe("21:30");
    expect(formatPublicEventTime(instant, "UTC")).toBe("00:30");
    expect(formatPublicEventTimeZone("America/Sao_Paulo")).toBe("São Paulo");
    expect(formatPublicEventTimeZone("America/Recife")).toBe("Recife");
  });

  it("keeps cancelled and completed events informative", () => {
    expect(publicEventStatusPresentation.cancelled.description).toContain(
      "continua válido",
    );
    expect(publicEventStatusPresentation.completed.description).toContain(
      "histórico",
    );
  });

  it("recognizes only compatibility failures from a database N-1", () => {
    expect(isPublicEventContractUnavailable({ code: "42P01" })).toBe(true);
    expect(isPublicEventContractUnavailable({ code: "PGRST205" })).toBe(true);
    expect(
      isPublicEventContractUnavailable({
        message:
          "Could not find the table 'public.public_event_directory' in the schema cache",
      }),
    ).toBe(true);
    expect(isPublicEventContractUnavailable({ code: "42501" })).toBe(false);
    expect(
      isPublicEventContractUnavailable({ message: "network unavailable" }),
    ).toBe(false);
  });
});
