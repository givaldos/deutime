import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/me/reconhecimentos",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { PlayerPortalNavigation } from "./player-portal-navigation";

describe("player portal recognition navigation", () => {
  it("inclui a jornada e quatro alvos móveis somente com a flag", () => {
    const html = renderToStaticMarkup(
      <PlayerPortalNavigation recognitionEnabled />,
    );

    expect(html).toContain('href="/me/reconhecimentos"');
    expect(html).toContain("Reconhecimentos");
    expect(html).toContain("grid-cols-4");
    expect(html).toContain('aria-current="page"');
  });

  it("preserva a navegação atual quando a flag falha fechado", () => {
    const html = renderToStaticMarkup(<PlayerPortalNavigation />);

    expect(html).not.toContain('href="/me/reconhecimentos"');
    expect(html).toContain("grid-cols-3");
  });
});
