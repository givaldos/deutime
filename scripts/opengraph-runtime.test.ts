import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/opengraph-image.tsx", "utf8");

describe("runtime da imagem Open Graph", () => {
  it("usa o runtime Node.js padrão do Next.js", () => {
    expect(source).not.toMatch(/export const runtime\s*=\s*["']edge["']/);
    expect(source).toContain('import { ImageResponse } from "next/og";');
  });
});
