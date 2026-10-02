import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const database = readFileSync(".github/workflows/database.yml", "utf8");
const deployDatabase = readFileSync(
  ".github/workflows/deploy-database.yml",
  "utf8",
);

describe("runtime das actions", () => {
  it("usa setup-node com runtime Node 24", () => {
    expect(ci).toContain(
      "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0",
    );
  });

  it("usa a mesma versão atual do setup-cli nos workflows de banco", () => {
    const references = [database, deployDatabase].flatMap((workflow) => [
      ...workflow.matchAll(
        /supabase\/setup-cli@([a-f0-9]{40}) # v([^\s]+)/g,
      ),
    ]);

    expect(references).toHaveLength(2);
    expect(new Set(references.map((reference) => reference[1]))).toEqual(
      new Set(["45a513f8c64c0bc8e0e3dfe572b5c95be85f6359"]),
    );
    expect(new Set(references.map((reference) => reference[2]))).toEqual(
      new Set(["3.0.1"]),
    );
  });
});
