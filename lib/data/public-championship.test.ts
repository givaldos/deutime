import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  privilegedFrom: vi.fn(),
  storageFrom: vi.fn(),
  createSignedUrl: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: vi.fn(() => ({
    from: mocks.privilegedFrom,
    storage: { from: mocks.storageFrom },
  })),
}));

import {
  getPublicChampionship,
  getPublicChampionshipOrganizer,
  getPublicChampionshipOrganizerMediaUrl,
  getPublicChampionshipWithFallback,
} from "./public-championship";

const publicId = "ca000000-0000-4000-8000-000000000001";
const validProjection = {
  championship: {
    public_id: publicId,
    name: "Liga Pública",
    format: "league",
    status: "published",
    win_points: 3,
    draw_points: 1,
    loss_points: 0,
    tiebreak_order: ["wins", "goal_difference"],
    group_count: null,
    qualifiers_per_group: null,
    published_at: "2026-08-13T12:00:00+00:00",
  },
  participants: [
    { seed: 1, name: "Verde", color: "#059669", badge_key: "shield", group_number: null, status: "active" },
    { seed: 2, name: "Azul", color: "#2563EB", badge_key: "stripes", group_number: null, status: "active" },
  ],
  standings: [],
  fixtures: [{
    stage: "league",
    status: "scheduled",
    group_number: null,
    round_number: 1,
    ordinal: 1,
    side_one_kind: "participant",
    side_two_kind: "participant",
    side_one: { seed: 1, name: "Verde", color: "#059669", badge_key: "shield" },
    side_two: { seed: 2, name: "Azul", color: "#2563EB", badge_key: "stripes" },
    winner_seed: null,
    resolution: null,
    score_one: null,
    score_two: null,
    event_public_id: null,
  }],
};

describe("getPublicChampionship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(mocks.info);
    vi.spyOn(console, "error").mockImplementation(mocks.error);
  });

  it("rejeita identificador inválido antes do banco", async () => {
    await expect(getPublicChampionship("../segredo")).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("aceita somente a projeção JSON estrita e mínima", async () => {
    mocks.rpc.mockResolvedValue({ data: validProjection, error: null });
    await expect(getPublicChampionship(publicId)).resolves.toEqual(validProjection);
    expect(mocks.rpc).toHaveBeenCalledWith("get_public_championship", {
      requested_public_id: publicId,
    });
  });

  it("falha fechado se a projeção trouxer um ID interno", async () => {
    mocks.rpc.mockResolvedValue({
      data: { ...validProjection, championship_id: "interno" },
      error: null,
    });
    await expect(getPublicChampionship(publicId)).resolves.toBeNull();
  });

  it("tolera schema N-1 e indisponibilidade sem ampliar a página", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST202", message: "missing" },
    });
    await expect(getPublicChampionship(publicId)).resolves.toBeNull();

    mocks.rpc.mockRejectedValueOnce(new Error("offline"));
    await expect(getPublicChampionshipWithFallback(
      "ca000000-0000-4000-8000-000000000002",
    )).resolves.toBeNull();
    expect(mocks.error).toHaveBeenCalledWith(
      "public_championship_projection.observed",
      expect.objectContaining({
        format: "fallback",
        participantCount: 0,
        fixtureCount: 0,
        standingCount: 0,
        fallback: true,
        error: "projection_unavailable",
      }),
    );
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain(
      "ca000000-0000-4000-8000-000000000002",
    );
  });

  it("registra somente formato, contagens e duração da projeção", async () => {
    mocks.rpc.mockResolvedValue({ data: validProjection, error: null });

    await expect(getPublicChampionshipWithFallback(
      "ca000000-0000-4000-8000-000000000003",
    )).resolves.toEqual(validProjection);
    expect(mocks.info).toHaveBeenCalledWith(
      "public_championship_projection.observed",
      expect.objectContaining({
        format: "league",
        participantCount: 2,
        fixtureCount: 1,
        standingCount: 0,
        fallback: false,
        error: "none",
        durationMs: expect.any(Number),
      }),
    );
    const serialized = JSON.stringify(mocks.info.mock.calls);
    expect(serialized).not.toContain("Liga Pública");
    expect(serialized).not.toContain(publicId);
  });

  it("anexa somente a identidade de um time que já possui página pública", async () => {
    const organizerPublicId = "ca000000-0000-4000-8000-000000000004";
    const championshipQuery = createQuery({
      data: { team_id: "ca200000-0000-4000-8000-000000000001" },
      error: null,
    });
    const teamQuery = createQuery({
      data: {
        slug: "time-da-vila",
        name: "Time da Vila",
        team_media: [
          { kind: "logo", storage_path: "time/logo.webp" },
          { kind: "cover", storage_path: "time/capa.webp" },
        ],
      },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: validProjection, error: null });
    mocks.privilegedFrom.mockImplementation((table: string) =>
      table === "championships" ? championshipQuery : teamQuery,
    );
    await expect(getPublicChampionshipOrganizer(organizerPublicId)).resolves.toEqual({
      slug: "time-da-vila",
      name: "Time da Vila",
      logo_url: `/c/${organizerPublicId}/media/logo`,
      cover_url: `/c/${organizerPublicId}/media/cover`,
    });
    expect(teamQuery.eq).toHaveBeenCalledWith("is_public", true);
    expect(teamQuery.in).toHaveBeenCalledWith("team_media.kind", ["logo", "cover"]);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("assina a mídia somente dentro do proxy server-side", async () => {
    const mediaPublicId = "ca000000-0000-4000-8000-000000000006";
    mocks.rpc.mockResolvedValue({ data: validProjection, error: null });
    mocks.privilegedFrom.mockImplementation((table: string) =>
      table === "championships"
        ? createQuery({
            data: { team_id: "ca200000-0000-4000-8000-000000000003" },
            error: null,
          })
        : createQuery({
            data: {
              slug: "time-da-vila",
              name: "Time da Vila",
              team_media: [{ kind: "logo", storage_path: "time/logo.webp" }],
            },
            error: null,
          }),
    );
    mocks.storageFrom.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://media.example.test/logo.webp?token=privado" },
      error: null,
    });

    await expect(
      getPublicChampionshipOrganizerMediaUrl(mediaPublicId, "logo"),
    ).resolves.toBe("https://media.example.test/logo.webp?token=privado");
    expect(mocks.storageFrom).toHaveBeenCalledWith("team_media");
    expect(mocks.createSignedUrl).toHaveBeenCalledWith("time/logo.webp", 60);
  });

  it("mantém o campeonato utilizável quando a identidade pública não está disponível", async () => {
    const privateOrganizerPublicId = "ca000000-0000-4000-8000-000000000005";
    mocks.rpc.mockResolvedValue({ data: validProjection, error: null });
    mocks.privilegedFrom.mockImplementation((table: string) =>
      table === "championships"
        ? createQuery({
            data: { team_id: "ca200000-0000-4000-8000-000000000002" },
            error: null,
          })
        : createQuery({ data: null, error: null }),
    );

    await expect(
      getPublicChampionshipOrganizer(privateOrganizerPublicId),
    ).resolves.toBeNull();
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  return query;
}
