import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  type?: string;
};

describe("formato dos módulos do pacote", () => {
  it("declara ESM explicitamente", () => {
    expect(packageJson.type).toBe("module");
  });
});
