import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dependabot = readFileSync(".github/dependabot.yml", "utf8");
const workflow = readFileSync(".github/workflows/codeql.yml", "utf8");

describe("atualização atômica do CodeQL", () => {
  it("agrupa todas as actions do CodeQL no Dependabot", () => {
    expect(dependabot).toContain('patterns: ["github/codeql-action/*"]');
  });

  it("mantém init e analyze no mesmo SHA e versão", () => {
    const references = [...workflow.matchAll(
      /github\/codeql-action\/(?:init|analyze)@([a-f0-9]{40}) # v([^\s]+)/g,
    )];

    expect(references).toHaveLength(2);
    expect(new Set(references.map((reference) => reference[1])).size).toBe(1);
    expect(new Set(references.map((reference) => reference[2])).size).toBe(1);
  });
});
