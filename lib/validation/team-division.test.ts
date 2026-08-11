import { describe, expect, it } from "vitest";
import { saveEventLineupDraftSchema } from "./team-division";

const base = {
  teamId: "d7200000-0000-4000-8000-000000000001",
  teamSlug: "society-united",
  eventId: "d7300000-0000-4000-8000-000000000001",
  requestId: "d7500000-0000-4000-8000-000000000001",
  squads: [
    { id: "d7600000-0000-4000-8000-000000000001", name: "Azul", color: "#0D9488", sort_order: 1 },
    { id: "d7600000-0000-4000-8000-000000000002", name: "Branco", color: "#2563EB", sort_order: 2 },
  ],
  assignments: [
    { athlete_id: "d7400000-0000-4000-8000-000000000001", squad_id: "d7600000-0000-4000-8000-000000000001", sort_order: 1, position_code: null, slot_kind: "starter" },
  ],
  exclusions: ["d7400000-0000-4000-8000-000000000002"],
};

describe("validação da divisão manual", () => {
  it("aceita o estado completo de um rascunho válido", () => {
    expect(saveEventLineupDraftSchema.safeParse(base).success).toBe(true);
  });

  it("exige de dois a doze times com nomes diferentes", () => {
    expect(
      saveEventLineupDraftSchema.safeParse({ ...base, squads: base.squads.slice(0, 1) }).success,
    ).toBe(false);
    expect(
      saveEventLineupDraftSchema.safeParse({
        ...base,
        squads: [base.squads[0], { ...base.squads[1], name: " azul " }],
      }).success,
    ).toBe(false);
  });

  it("rejeita atleta simultaneamente escalado e fora", () => {
    expect(
      saveEventLineupDraftSchema.safeParse({
        ...base,
        exclusions: ["d7400000-0000-4000-8000-000000000001"],
      }).success,
    ).toBe(false);
  });

  it("rejeita escalação que aponta para time removido", () => {
    expect(
      saveEventLineupDraftSchema.safeParse({
        ...base,
        assignments: [{ ...base.assignments[0], squad_id: "d7600000-0000-4000-8000-000000000099" }],
      }).success,
    ).toBe(false);
  });
});
