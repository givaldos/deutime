import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  return { rpc, createClient: vi.fn(async () => ({ rpc })) };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import {
  buildManagementChampionshipListUrl,
  decodeManagementChampionshipCursor,
  encodeManagementChampionshipCursor,
  getManagementChampionshipPage,
  parseManagementChampionshipSearchParams,
  safeManagementChampionshipReturnTo,
  type ManagementChampionshipFilters,
} from "./management-championships";

const teamId = "11111111-1111-4111-8111-111111111111";
const championshipId = "22222222-2222-4222-8222-222222222222";
const cursor = { sort_at: "2026-09-10T22:00:00+00:00", id: championshipId };
const filters: ManagementChampionshipFilters = {
  status: "active",
  search: "Copa regional",
  format: "groups_knockout",
  createdStart: "2026-01-01",
  createdEnd: "2026-12-31",
  cursor,
};
const validPage = {
  items: [{
    id: championshipId,
    name: "Copa regional",
    format: "groups_knockout",
    status: "active",
    status_label: "Em andamento",
    active_participants: 8,
    completed_fixtures: 7,
    total_fixtures: 15,
    next_action: "Abrir campeonato",
    created_at: "2026-02-01T12:00:00+00:00",
  }],
  filtered_count: 35,
  next_cursor: cursor,
  effective_filters: { status: "active" },
};

describe("management championships data boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normaliza filtros combinados e mantém o cursor estrito", () => {
    const encoded = encodeManagementChampionshipCursor(cursor);
    expect(decodeManagementChampionshipCursor(encoded)).toEqual(cursor);
    expect(parseManagementChampionshipSearchParams({
      status: "active",
      q: "  Copa\u0000   regional ",
      format: "groups_knockout",
      from: "2026-01-01",
      to: "2026-12-31",
      cursor: encoded,
    })).toEqual({ ok: true, openNew: false, filters });
  });

  it.each([
    [{ status: ["draft", "active"] }, "mais de uma vez"],
    [{ unknown: "1" }, "desconhecido"],
    [{ status: "aberto" }, "situação"],
    [{ format: "suíço" }, "formato"],
    [{ from: "2026-12-31", to: "2026-01-01" }, "ordem correta"],
    [{ cursor: "inválido" }, "página solicitada"],
    [{ new: "sim" }, "ação solicitada"],
  ])("rejeita URL ambígua ou adulterada", (query, message) => {
    expect(parseManagementChampionshipSearchParams(query)).toMatchObject({
      ok: false,
      message: expect.stringContaining(message),
    });
  });

  it("preserva filtros e cursor na URL da lista", () => {
    const url = buildManagementChampionshipListUrl("campo-fc", filters, cursor);
    expect(url).toContain("/app/campo-fc/championships?status=active&q=Copa+regional");
    expect(url).toContain("format=groups_knockout");
    expect(url).toContain("cursor=");
  });

  it("aceita retorno somente para a lista do mesmo time", () => {
    const returnTo = "/app/campo-fc/championships?status=active";
    expect(safeManagementChampionshipReturnTo("campo-fc", returnTo)).toBe(returnTo);
    expect(safeManagementChampionshipReturnTo("campo-fc", "https://malicioso.example/app/campo-fc/championships")).toBeNull();
    expect(safeManagementChampionshipReturnTo("campo-fc", "/app/outro/championships")).toBeNull();
    expect(safeManagementChampionshipReturnTo("campo-fc", `${returnTo}#topo`)).toBeNull();
  });

  it("delega todos os filtros ao read model e valida a resposta", async () => {
    mocks.rpc.mockResolvedValue({ data: validPage, error: null });
    await expect(getManagementChampionshipPage(teamId, filters)).resolves.toEqual({
      mode: "enhanced",
      page: validPage,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("list_management_championships", {
      requested_team_id: teamId,
      requested_status: "active",
      requested_search: "Copa regional",
      requested_format: "groups_knockout",
      requested_created_start: "2026-01-01",
      requested_created_end: "2026-12-31",
      requested_limit: 24,
      requested_cursor: cursor,
    });
  });

  it.each(["P0001", "42883", "PGRST202"])("aciona fallback para contrato indisponível (%s)", async (code) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "indisponível" } });
    await expect(getManagementChampionshipPage(teamId, filters)).resolves.toEqual({ mode: "unavailable" });
  });

  it("diferencia erro inesperado e resposta inválida", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "erro" } });
    await expect(getManagementChampionshipPage(teamId, filters)).resolves.toEqual({ mode: "error" });
    mocks.rpc.mockResolvedValueOnce({ data: { items: [] }, error: null });
    await expect(getManagementChampionshipPage(teamId, filters)).resolves.toEqual({ mode: "error" });
  });
});
