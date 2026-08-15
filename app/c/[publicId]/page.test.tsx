import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicChampionshipWithFallback: vi.fn(),
  getPublicChampionshipOrganizer: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/public-championship", () => ({
  getPublicChampionshipWithFallback:
    mocks.getPublicChampionshipWithFallback,
  getPublicChampionshipOrganizer:
    mocks.getPublicChampionshipOrganizer,
}));
vi.mock("@/lib/env/server", () => ({
  getAppUrl: () => "https://deutime.app",
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import PublicChampionshipPage, { generateMetadata } from "./page";

const publicId = "ca000000-0000-4000-8000-000000000001";
const eventPublicId = "ea000000-0000-4000-8000-000000000001";

const leagueProjection = {
  championship: {
    public_id: publicId,
    name: "Liga da Vila",
    format: "league" as const,
    status: "active" as const,
    win_points: 3,
    draw_points: 1,
    loss_points: 0,
    tiebreak_order: ["wins", "goal_difference"] as const,
    group_count: null,
    qualifiers_per_group: null,
    published_at: "2026-08-13T12:00:00+00:00",
  },
  participants: [
    {
      seed: 1,
      name: "Verde",
      color: "#059669",
      badge_key: "shield" as const,
      group_number: null,
      status: "active" as const,
    },
    {
      seed: 2,
      name: "Azul",
      color: "#2563EB",
      badge_key: "stripes" as const,
      group_number: null,
      status: "active" as const,
    },
  ],
  standings: [
    {
      seed: 1,
      name: "Verde",
      color: "#059669",
      badge_key: "shield" as const,
      group_number: null,
      rank_position: 1,
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goals_for: 2,
      goals_against: 1,
      goal_difference: 1,
      points: 3,
    },
    {
      seed: 2,
      name: "Azul",
      color: "#2563EB",
      badge_key: "stripes" as const,
      group_number: null,
      rank_position: 2,
      played: 1,
      wins: 0,
      draws: 0,
      losses: 1,
      goals_for: 1,
      goals_against: 2,
      goal_difference: -1,
      points: 0,
    },
  ],
  fixtures: [
    {
      stage: "league" as const,
      status: "finalized" as const,
      group_number: null,
      round_number: 1,
      ordinal: 1,
      side_one_kind: "participant" as const,
      side_two_kind: "participant" as const,
      side_one: {
        seed: 1,
        name: "Verde",
        color: "#059669",
        badge_key: "shield" as const,
      },
      side_two: {
        seed: 2,
        name: "Azul",
        color: "#2563EB",
        badge_key: "stripes" as const,
      },
      winner_seed: 1,
      resolution: "score" as const,
      score_one: 2,
      score_two: 1,
      event_public_id: eventPublicId,
    },
  ],
};

function props(id = publicId) {
  return { params: Promise.resolve({ publicId: id }) };
}

describe("public championship route", () => {
  beforeEach(() => {
    mocks.getPublicChampionshipWithFallback.mockReset();
    mocks.getPublicChampionshipOrganizer.mockReset();
    mocks.getPublicChampionshipOrganizer.mockResolvedValue({
      slug: "time-da-vila",
      name: "Time da Vila",
      logo_url: `/c/${publicId}/media/logo`,
      cover_url: `/c/${publicId}/media/cover`,
    });
  });

  it("publica metadados contextuais, canônicos e não indexáveis", async () => {
    mocks.getPublicChampionshipWithFallback.mockResolvedValue(leagueProjection);

    const metadata = await generateMetadata(props());
    const serialized = JSON.stringify(metadata);

    expect(metadata.title).toBe("Liga da Vila — DeuTime");
    expect(metadata.alternates).toEqual({ canonical: `/c/${publicId}` });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
    expect(metadata.openGraph).toMatchObject({
      url: `/c/${publicId}`,
      title: "Liga da Vila — DeuTime",
    });
    expect(serialized).not.toContain("athlete");
    expect(serialized).not.toContain("venue");
    expect(serialized).not.toContain("championship_id");
  });

  it("renderiza regulamento, classificação e somente o placar público autorizado", async () => {
    mocks.getPublicChampionshipWithFallback.mockResolvedValue(leagueProjection);

    const html = renderToStaticMarkup(await PublicChampionshipPage(props()));

    expect(html).toContain("Regulamento publicado");
    expect(html).toContain("Página oficial");
    expect(html).toContain("Time da Vila");
    expect(html).toContain("Escudo do Time da Vila");
    expect(html).toContain("/t/time-da-vila");
    expect(html).toContain(`/c/${publicId}/media/logo`);
    expect(html).toContain(`/c/${publicId}/media/cover`);
    expect(html).not.toContain("token=");
    expect(html).not.toContain("storage_path");
    expect(html).toContain("flex-nowrap");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("Classificação");
    expect(html).toContain("Verde");
    expect(html).toContain("Azul");
    expect(html).toContain("2 × 1");
    expect(html).toContain(`/e/${eventPublicId}`);
    expect(html).toContain("Compartilhar campeonato");
    expect(html).not.toContain("athlete_id");
    expect(html).not.toContain("championship_id");
    expect(html).not.toContain("venue_address");
  });

  it("renderiza mata-mata, bye e avanço sem inventar classificação", async () => {
    mocks.getPublicChampionshipWithFallback.mockResolvedValue({
      ...leagueProjection,
      championship: {
        ...leagueProjection.championship,
        name: "Copa Relâmpago",
        format: "knockout",
      },
      standings: [],
      fixtures: [
        {
          ...leagueProjection.fixtures[0],
          stage: "knockout",
          side_two_kind: "bye",
          side_two: null,
          score_one: null,
          score_two: null,
          event_public_id: null,
          resolution: "regulation",
        },
      ],
    });

    const html = renderToStaticMarkup(await PublicChampionshipPage(props()));

    expect(html).toContain("Copa Relâmpago");
    expect(html).toContain("Mata-mata · fase 1");
    expect(html).toContain("Bye");
    expect(html).toContain("Avança: Verde · Regulamento");
    expect(html).not.toContain("Classificação");
    expect(html).not.toContain("Abrir página da partida");
  });

  it("preserva o campeonato quando o time não possui identidade pública", async () => {
    mocks.getPublicChampionshipWithFallback.mockResolvedValue(leagueProjection);
    mocks.getPublicChampionshipOrganizer.mockResolvedValue(null);

    const html = renderToStaticMarkup(await PublicChampionshipPage(props()));

    expect(html).toContain("Liga da Vila");
    expect(html).toContain("Classificação");
    expect(html).not.toContain("Página oficial");
    expect(html).not.toContain("Escudo do");
  });

  it("falha fechado com o mesmo 404 quando a projeção não está pública", async () => {
    mocks.getPublicChampionshipWithFallback.mockResolvedValue(null);

    await expect(PublicChampionshipPage(props())).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    const metadata = await generateMetadata(props());
    expect(metadata).toMatchObject({
      title: "Campeonato não encontrado",
      robots: { index: false, follow: false, nocache: true },
    });
  });
});
