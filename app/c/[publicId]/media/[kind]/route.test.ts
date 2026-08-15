import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMediaUrl: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/public-championship", () => ({
  getPublicChampionshipOrganizerMediaUrl: mocks.getMediaUrl,
}));

import { GET } from "./route";

const publicId = "ca000000-0000-4000-8000-000000000001";

function context(kind: string) {
  return { params: Promise.resolve({ publicId, kind }) };
}

describe("public championship organizer media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  it("serve a imagem pelo próprio domínio sem cache nem redirecionamento", async () => {
    mocks.getMediaUrl.mockResolvedValue(
      "https://media.example.test/logo.webp?token=privado",
    );
    mocks.fetch.mockResolvedValue(new Response("imagem", {
      status: 200,
      headers: { "Content-Type": "image/webp" },
    }));

    const response = await GET(new Request("https://deutime.app"), context("logo"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("imagem");
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://media.example.test/logo.webp?token=privado",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("falha fechado para tipo desconhecido ou mídia indisponível", async () => {
    await expect(
      GET(new Request("https://deutime.app"), context("gallery")),
    ).resolves.toMatchObject({ status: 404 });
    expect(mocks.getMediaUrl).not.toHaveBeenCalled();

    mocks.getMediaUrl.mockResolvedValue(null);
    await expect(
      GET(new Request("https://deutime.app"), context("cover")),
    ).resolves.toMatchObject({ status: 404 });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("recusa resposta que não seja imagem permitida", async () => {
    mocks.getMediaUrl.mockResolvedValue(
      "https://media.example.test/logo.webp?token=privado",
    );
    mocks.fetch.mockResolvedValue(new Response("<html>erro</html>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }));

    const response = await GET(new Request("https://deutime.app"), context("logo"));

    expect(response.status).toBe(404);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
