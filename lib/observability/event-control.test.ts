import { classifyEventControlFailure } from "./event-control";
import { describe, expect, it } from "vitest";

describe("event control observability", () => {
  it.each(["22023", "42501", "55000"])(
    "classifies domain SQLSTATE %s as an expected rejection",
    (code) => {
      expect(classifyEventControlFailure({ code })).toEqual({
        feature: "event_control",
        outcome: "rejected",
        code,
      });
    },
  );

  it("classifies unknown database failures as operational", () => {
    expect(classifyEventControlFailure({ code: "XX000" })).toEqual({
      feature: "event_control",
      outcome: "failed",
      code: "XX000",
    });
    expect(classifyEventControlFailure(null)).toEqual({
      feature: "event_control",
      outcome: "failed",
      code: "unknown",
    });
  });
});
