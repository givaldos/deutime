import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getRecognitionAvailability: vi.fn(),
  getMyRecognitions: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/data/recognition", () => ({
  getRecognitionAvailability: mocks.getRecognitionAvailability,
  getMyRecognitions: mocks.getMyRecognitions,
}));

import RecognitionsPage from "./page";

const recognitions = [
  {
    catalog_version: "recognition-v1" as const,
    kind: "goal_recorded" as const,
    team_id: "b0200000-0000-4000-8000-000000000001",
    team_name: "Society United",
    source_id: "b0700000-0000-4000-8000-000000000001",
    match_id: "b0500000-0000-4000-8000-000000000001",
    event_id: "b0400000-0000-4000-8000-000000000001",
    event_title: "Jogo de domingo",
    match_ordinal: 2,
    recognized_at: "2026-08-16T18:00:00.000-03:00",
  },
  {
    catalog_version: "recognition-v1" as const,
    kind: "assist_recorded" as const,
    team_id: "b0200000-0000-4000-8000-000000000001",
    team_name: "Society United",
    source_id: "b0700000-0000-4000-8000-000000000002",
    match_id: "b0500000-0000-4000-8000-000000000001",
    event_id: "b0400000-0000-4000-8000-000000000001",
    event_title: "Jogo de domingo",
    match_ordinal: 2,
    recognized_at: "2026-08-16T18:00:00.000-03:00",
  },
  {
    catalog_version: "recognition-v1" as const,
    kind: "crowd_star" as const,
    team_id: "b0200000-0000-4000-8000-000000000001",
    team_name: "Society United",
    source_id: "b0500000-0000-4000-8000-000000000001",
    match_id: "b0500000-0000-4000-8000-000000000001",
    event_id: "b0400000-0000-4000-8000-000000000001",
    event_title: "Jogo de domingo",
    match_ordinal: 2,
    recognized_at: "2026-08-16T19:00:00.000-03:00",
  },
];

describe("private recognitions route", () => {
  beforeEach(() => {
    mocks.requireUser.mockReset();
    mocks.requireUser.mockResolvedValue({ id: "user-r10" });
    mocks.getRecognitionAvailability.mockReset();
    mocks.getRecognitionAvailability.mockResolvedValue(true);
    mocks.getMyRecognitions.mockReset();
    mocks.getMyRecognitions.mockResolvedValue(recognitions);
  });

  it("mostra somente cartões positivos com a origem esportiva", async () => {
    const html = renderToStaticMarkup(await RecognitionsPage());

    expect(html).toContain('data-testid="recognition-private-view"');
    expect(html).toContain("Gol registrado");
    expect(html).toContain("Assistência registrada");
    expect(html).toContain("Craque da Galera");
    expect(html).toContain("Society United");
    expect(html).toContain("Jogo de domingo");
    expect(html).toContain("Partida 2");
    expect(html).toContain("Não há pontos, notas, sequência ou ranking");
    expect(html).not.toContain("b0700000-0000-4000-8000-000000000001");
    expect(html).not.toContain("source_id");
  });

  it("mantém o estado vazio informativo quando ainda não há fatos", async () => {
    mocks.getMyRecognitions.mockResolvedValue([]);

    const html = renderToStaticMarkup(await RecognitionsPage());

    expect(html).toContain('data-testid="recognition-empty-state"');
    expect(html).toContain("Os próximos vêm do jogo");
  });

  it("falha fechado e preserva o perfil quando a flag está desligada", async () => {
    mocks.getRecognitionAvailability.mockResolvedValue(false);

    const html = renderToStaticMarkup(await RecognitionsPage());

    expect(html).toContain('data-testid="recognition-fallback"');
    expect(html).toContain("Seu perfil continua normal");
    expect(html).toContain('href="/me/perfil"');
    expect(mocks.getMyRecognitions).not.toHaveBeenCalled();
  });

  it("usa o mesmo fallback quando a projeção está indisponível", async () => {
    mocks.getMyRecognitions.mockResolvedValue(null);

    const html = renderToStaticMarkup(await RecognitionsPage());

    expect(html).toContain('data-testid="recognition-fallback"');
    expect(html).not.toContain('data-testid="recognition-private-view"');
  });
});
