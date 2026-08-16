import { describe, expect, it } from "vitest";
import {
  recognitionCatalog,
  recognitionCatalogVersion,
  recognitionKinds,
} from "./catalog";

describe("recognition-v1", () => {
  it("mantém somente o catálogo factual aceito", () => {
    expect(recognitionCatalogVersion).toBe("recognition-v1");
    expect(recognitionKinds).toEqual([
      "goal_recorded",
      "assist_recorded",
      "crowd_star",
    ]);
    expect(Object.keys(recognitionCatalog)).toEqual(recognitionKinds);
  });

  it("não introduz pontos, notas ou ranking no contrato", () => {
    const serialized = JSON.stringify(recognitionCatalog);

    expect(serialized).not.toMatch(/point|score|rating|rank|streak|level/i);
    expect(
      recognitionKinds.map((kind) => recognitionCatalog[kind].source),
    ).toEqual([
      "finalized_match_event",
      "finalized_match_event",
      "closed_craque_result",
    ]);
  });
});
