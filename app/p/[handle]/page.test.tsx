import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicPlayer: vi.fn(),
}));

vi.mock("@/lib/data/public-player", () => ({
  getPublicPlayer: mocks.getPublicPlayer,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import PublicPlayerPage from "./page";

const player = {
  handle: "givaldo",
  display_name: "Givaldo Silva",
  preferred_name: "Givaldo",
  bio: "Meia de criação.",
  photo_path: null,
  photo_url: null,
  positions: [
    {
      sport_format: "society",
      code: "MID",
      label: "Meio-campo",
      priority: 1,
    },
  ],
  statistics: {
    matches_played: 12,
    goals: 4,
    assists: 7,
    yellow_cards: 1,
    red_cards: 0,
  },
  recognitions: [],
};

function props(handle = player.handle) {
  return { params: Promise.resolve({ handle }) };
}

describe("public player route", () => {
  beforeEach(() => {
    mocks.getPublicPlayer.mockReset();
    mocks.getPublicPlayer.mockResolvedValue(player);
  });

  it("uses the same compact visual hierarchy as the public event", async () => {
    const html = renderToStaticMarkup(await PublicPlayerPage(props()));

    expect(html).toContain('data-testid="public-player-header"');
    expect(html).toContain("pb-14 pt-5");
    expect(html).toContain('data-testid="public-player-content"');
    expect(html).toContain("relative z-10");
    expect(html).toContain("-mt-8");
    expect(html).toContain("Perfil público");
    expect(html).toContain("Sobre o atleta");
  });

  it("keeps the public information and statistics visible", async () => {
    const html = renderToStaticMarkup(await PublicPlayerPage(props()));

    expect(html).toContain("Givaldo");
    expect(html).toContain("@givaldo");
    expect(html).toContain("Meia de criação.");
    expect(html).toContain("Meio-campo");
    expect(html).toContain("Estatísticas");
    expect(html).toContain("Assist.");
  });

  it("shows only consented aggregate recognition categories", async () => {
    mocks.getPublicPlayer.mockResolvedValue({
      ...player,
      recognitions: [
        {
          catalog_version: "recognition-v1",
          kind: "goal_recorded",
          recognition_count: 4,
        },
        {
          catalog_version: "recognition-v1",
          kind: "crowd_star",
          recognition_count: 2,
        },
      ],
    });

    const html = renderToStaticMarkup(await PublicPlayerPage(props()));

    expect(html).toContain("Conquistas reconhecidas");
    expect(html).toContain("Gols reconhecidos");
    expect(html).toContain("Craques da Galera");
    expect(html).toContain("sem ranking ou comparação");
    expect(html).not.toContain("recognition-v1");
    expect(html).not.toMatch(/team_id|source_id|match_id|event_id/);
  });

  it("preserves the current public profile when no summary is consented", async () => {
    const html = renderToStaticMarkup(await PublicPlayerPage(props()));

    expect(html).not.toContain("Conquistas reconhecidas");
    expect(html).toContain("Estatísticas");
    expect(html).toContain("Posições preferenciais");
  });

  it("returns not found for an invalid or absent public profile", async () => {
    await expect(PublicPlayerPage(props("../perfil"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mocks.getPublicPlayer).not.toHaveBeenCalled();

    mocks.getPublicPlayer.mockResolvedValue(null);
    await expect(PublicPlayerPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
