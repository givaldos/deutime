import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandMark } from "./brand-mark";

describe("BrandMark", () => {
  it("keeps an accessible name, 44px touch target and visible keyboard focus", () => {
    const html = renderToStaticMarkup(<BrandMark inverted />);

    expect(html).toContain('aria-label="DeuTime"');
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-w-11");
    expect(html).toContain("focus-visible:ring-4");
    expect(html).toContain('alt=""');
  });
});
