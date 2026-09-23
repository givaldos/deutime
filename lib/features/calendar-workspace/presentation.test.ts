import { describe, expect, it } from "vitest";

import {
  calendarDayForInstant,
  getCalendarPeriod,
  groupCalendarItemsByDay,
  parseCalendarSelection,
  todayInTimeZone,
} from "./presentation";

describe("apresentação civil do calendário", () => {
  it("deriva hoje no fuso do time perto da virada UTC", () => {
    const now = new Date("2026-10-01T01:30:00.000Z");
    expect(todayInTimeZone("America/Sao_Paulo", now)).toBe("2026-09-30");
    expect(todayInTimeZone("Europe/Lisbon", now)).toBe("2026-10-01");
  });

  it("valida modo e data sem aceitar parâmetros ambíguos", () => {
    expect(parseCalendarSelection({ mode: "month", date: "2026-09-22", today: "2026-09-22" }))
      .toEqual({ ok: true, mode: "month", anchorDate: "2026-09-22" });
    expect(parseCalendarSelection({ mode: "drag", date: null, today: "2026-09-22" }))
      .toMatchObject({ ok: false });
    expect(parseCalendarSelection({ mode: "week", date: "2026-02-30", today: "2026-09-22" }))
      .toMatchObject({ ok: false });
  });

  it("monta semana de segunda a domingo atravessando mês e ano", () => {
    expect(getCalendarPeriod("week", "2027-01-01")).toMatchObject({
      start: "2026-12-28",
      end: "2027-01-03",
      previousAnchor: "2026-12-25",
      nextAnchor: "2027-01-08",
    });
  });

  it("monta grade mensal estável com seis semanas e navegação civil", () => {
    const period = getCalendarPeriod("month", "2026-09-22");
    expect(period.start).toBe("2026-08-31");
    expect(period.end).toBe("2026-10-11");
    expect(period.days).toHaveLength(42);
    expect(period.previousAnchor).toBe("2026-08-01");
    expect(period.nextAnchor).toBe("2026-10-01");
  });

  it("agrupa no dia do time e elimina duplicação por vínculo", () => {
    const item = {
      id: "event-1",
      starts_at: "2026-09-22T01:30:00.000Z",
      ends_at: "2026-09-23T04:00:00.000Z",
    };
    const grouped = groupCalendarItemsByDay([item, item], "America/Sao_Paulo");
    expect(calendarDayForInstant(item.starts_at, "America/Sao_Paulo")).toBe("2026-09-21");
    expect(grouped.get("2026-09-21")).toEqual([item]);
    expect(grouped.get("2026-09-22")).toEqual([item]);
    expect(grouped.get("2026-09-23")).toEqual([item]);
  });
});
