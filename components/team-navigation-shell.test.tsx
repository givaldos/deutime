import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/time-a/championships/campeonato-a",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { TeamAppHeader } from "./team-app-header";
import { TeamBottomNav } from "./team-bottom-nav";

describe("invólucro de navegação do time", () => {
  it("usa os mesmos cinco destinos no desktop e no móvel", () => {
    const props = {
      currentName: "Time A",
      currentSlug: "time-a",
      teams: [{ name: "Time A", slug: "time-a" }],
      role: "owner" as const,
      championshipsEnabled: true,
    };
    const desktop = renderToStaticMarkup(<TeamAppHeader {...props} />);
    const mobile = renderToStaticMarkup(
      <TeamBottomNav
        teamSlug="time-a"
        role="owner"
        championshipsEnabled
      />,
    );

    for (const label of ["Início", "Jogos", "Campeonatos", "Atletas", "Mais"]) {
      expect(desktop).toContain(label);
      expect(mobile).toContain(label);
    }
    expect(desktop).toContain("hidden items-center gap-1 lg:flex");
    expect(mobile).toContain("lg:hidden");
    expect(mobile).toContain("grid-cols-5");
    expect(desktop.match(/aria-current="page"/g)).toHaveLength(1);
    expect(mobile.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("preserva o fallback e não oferece Ajustes ao manager", () => {
    const fallback = renderToStaticMarkup(
      <TeamBottomNav teamSlug="time-a" active="events" nextEventId="evento-a" />,
    );
    const managerHeader = renderToStaticMarkup(
      <TeamAppHeader
        currentName="Time A"
        currentSlug="time-a"
        teams={[]}
        role="manager"
      />,
    );

    expect(fallback).toContain("legacy-team-bottom-nav");
    expect(fallback).toContain("Súmula");
    expect(managerHeader).not.toContain("Configurar este time");
    expect(managerHeader).toContain('aria-label="Editar perfil"');
  });

  it("exibe o escudo autorizado ou iniciais sem perder o nome do time", () => {
    const withLogo = renderToStaticMarkup(
      <TeamAppHeader
        currentName="Time A"
        currentSlug="time-a"
        teams={[]}
        role="admin"
        logoUrl="https://example.test/logo.webp"
      />,
    );
    const fallback = renderToStaticMarkup(
      <TeamAppHeader
        currentName="Bola FC"
        currentSlug="bola-fc"
        teams={[]}
        role="admin"
      />,
    );

    expect(withLogo).toContain('alt="Escudo do Time A"');
    expect(fallback).toContain(">B<");
    expect(fallback).toContain("Bola FC");
  });
});
