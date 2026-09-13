import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const positionsResult = { data: [{ code: "ALA", label: "Ala" }], error: null };
  const positionsQuery: Record<string, unknown> = {};
  positionsQuery.select = vi.fn(() => positionsQuery);
  positionsQuery.eq = vi.fn(() => positionsQuery);
  positionsQuery.order = vi.fn(async () => positionsResult);
  const from = vi.fn(() => positionsQuery);
  const createSignedUrls = vi.fn();
  const storageFrom = vi.fn(() => ({ createSignedUrls }));
  const createClient = vi.fn(async () => ({
    rpc,
    from,
    storage: { from: storageFrom },
  }));
  return { rpc, from, positionsQuery, createSignedUrls, storageFrom, createClient };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import {
  buildManagementAthleteListUrl,
  decodeManagementAthleteCursor,
  encodeManagementAthleteCursor,
  getManagementAthletePage,
  parseManagementAthleteSearchParams,
  type ManagementAthleteFilters,
} from "./management-athletes";

const teamId = "11111111-1111-4111-8111-111111111111";
const athleteA = "22222222-2222-4222-8222-222222222222";
const athleteB = "33333333-3333-4333-8333-333333333333";
const photoPath = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/profile/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp";
const cursor = { sort_name: "joao", id: athleteA };
const filters: ManagementAthleteFilters = {
  status: "active",
  search: "João",
  positionCode: "ALA",
  cursor,
};
const validPayload = {
  items: [athleteA, athleteB].map((id) => ({
    id,
    registration_number: id === athleteA ? 1 : 2,
    claimed: true,
    display_name: id === athleteA ? "João" : "Jota",
    full_name: id === athleteA ? "João da Silva" : "José Santos",
    shirt_number: 10,
    status: "active",
    positions: [{ sport_format: "society", code: "ALA", label: "Ala", priority: 1 }],
    photo_source: "player_profile",
    photo_path: photoPath,
    allowed_actions: { can_review: false, can_edit: true, can_remove: true },
  })),
  filtered_count: 222,
  pending_count: 3,
  next_cursor: cursor,
  effective_filters: { status: "active", search: "joao", position_code: "ALA" },
};

describe("management athletes data boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: validPayload, error: null });
    mocks.createSignedUrls.mockResolvedValue({
      data: [{ path: photoPath, signedUrl: "https://storage.test/signed-photo" }],
      error: null,
    });
  });

  it("normaliza filtros e preserva um cursor estrito", () => {
    const encoded = encodeManagementAthleteCursor(cursor);
    expect(decodeManagementAthleteCursor(encoded)).toEqual(cursor);
    expect(parseManagementAthleteSearchParams({
      q: "  João\u0000  ",
      position: "ala",
      cursor: encoded,
      created: "1",
    })).toEqual({ ok: true, filters });
  });

  it.each([
    [{ status: ["active", "inactive"] }, "mais de uma vez"],
    [{ status: "removed" }, "situação"],
    [{ q: "x" }, "entre 2 e 80"],
    [{ position: "A-LA" }, "posição"],
    [{ cursor: "inválido" }, "página solicitada"],
    [{ estranho: "1" }, "desconhecido"],
  ])("rejeita filtros ambíguos ou adulterados", (query, message) => {
    expect(parseManagementAthleteSearchParams(query)).toMatchObject({
      ok: false,
      message: expect.stringContaining(message),
    });
  });

  it("monta URL sem perder situação, busca, posição ou cursor", () => {
    expect(buildManagementAthleteListUrl("meu-time", filters, cursor)).toContain(
      "/app/meu-time/athletes?q=Jo%C3%A3o&position=ALA&cursor=",
    );
    expect(buildManagementAthleteListUrl("meu-time", {
      status: "pending",
      search: null,
      positionCode: null,
    })).toBe("/app/meu-time/athletes?status=pending");
  });

  it("delega filtros à RPC e assina caminhos deduplicados uma única vez", async () => {
    const result = await getManagementAthletePage(teamId, "society", filters);

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("list_management_athletes", {
      requested_team_id: teamId,
      requested_status: "active",
      requested_search: "João",
      requested_position_code: "ALA",
      requested_limit: 24,
      requested_cursor: cursor,
    });
    expect(mocks.createSignedUrls).toHaveBeenCalledOnce();
    expect(mocks.createSignedUrls).toHaveBeenCalledWith([photoPath], 900);
    expect(result).toMatchObject({
      mode: "enhanced",
      page: {
        filteredCount: 222,
        pendingCount: 3,
        positions: [{ code: "ALA", label: "Ala" }],
        items: [
          { id: athleteA, photo_url: "https://storage.test/signed-photo" },
          { id: athleteB, photo_url: "https://storage.test/signed-photo" },
        ],
      },
    });
    if (result.mode === "enhanced") {
      expect(result.page.items[0]).not.toHaveProperty("photo_path");
    }
  });

  it("mantém a lista com iniciais quando a assinatura de mídia falha", async () => {
    mocks.createSignedUrls.mockResolvedValue({ data: null, error: { code: "storage_error" } });
    const result = await getManagementAthletePage(teamId, "society", filters);
    expect(result).toMatchObject({
      mode: "enhanced",
      page: { items: [{ photo_url: null }, { photo_url: null }] },
    });
  });

  it.each(["P0001", "42883", "PGRST202"])(
    "mantém o fallback quando o contrato está indisponível (%s)",
    async (code) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "indisponível" } });
      await expect(getManagementAthletePage(teamId, "society", filters)).resolves.toEqual({ mode: "unavailable" });
      expect(mocks.createSignedUrls).not.toHaveBeenCalled();
    },
  );

  it("falha explicitamente diante de erro inesperado ou resposta inválida", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "erro" } });
    await expect(getManagementAthletePage(teamId, "society", filters)).resolves.toEqual({ mode: "error" });
    mocks.rpc.mockResolvedValueOnce({ data: { items: [] }, error: null });
    await expect(getManagementAthletePage(teamId, "society", filters)).resolves.toEqual({ mode: "error" });
    expect(mocks.createSignedUrls).not.toHaveBeenCalled();
  });
});
