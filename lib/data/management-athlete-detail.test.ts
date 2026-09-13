import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const createSignedUrl = vi.fn();
  const storageFrom = vi.fn(() => ({ createSignedUrl }));
  const createClient = vi.fn(async () => ({
    rpc,
    storage: { from: storageFrom },
  }));
  return { rpc, createSignedUrl, storageFrom, createClient };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import {
  getManagementAthleteDetail,
  safeManagementAthleteReturnTo,
} from "./management-athlete-detail";
import { encodeManagementAthleteCursor } from "./management-athletes";

const teamId = "11111111-1111-4111-8111-111111111111";
const athleteId = "22222222-2222-4222-8222-222222222222";
const eventId = "33333333-3333-4333-8333-333333333333";
const photoPath = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/profile/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp";
const validPayload = {
  id: athleteId,
  registration_number: 42,
  claimed: true,
  display_name: "João Jota",
  full_name: "João da Silva",
  shirt_number: 10,
  status: "active",
  registration_source: "admin",
  joined_on: "2026-01-10",
  created_at: "2026-01-10T12:00:00+00:00",
  contact: {
    birth_date: "1990-05-20",
    phone_e164: "+5511999999999",
    email: "jota@example.test",
    notes: "Contato privado",
  },
  positions: [{ sport_format: "society", code: "ALA", label: "Ala", priority: 1 }],
  photo_source: "player_profile",
  photo_path: photoPath,
  recent_participations: [{
    event_id: eventId,
    title: "Amistoso encerrado",
    kind: "friendly",
    starts_at: "2026-09-01T18:00:00+00:00",
    status: "completed",
    attendance_status: "confirmed",
    in_lineup: true,
  }],
  sports_statistics_available: false,
  allowed_actions: {
    can_review: false,
    can_edit: true,
    can_remove: true,
    can_change_availability: true,
  },
};

describe("management athlete detail data boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: validPayload, error: null });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.test/detail-photo" },
      error: null,
    });
  });

  it("obtém uma projeção estreita e assina a foto por 15 minutos", async () => {
    const result = await getManagementAthleteDetail(teamId, athleteId);

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("get_management_athlete_detail", {
      requested_team_id: teamId,
      requested_athlete_id: athleteId,
    });
    expect(mocks.storageFrom).toHaveBeenCalledWith("athlete_avatars");
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(photoPath, 900);
    expect(result).toMatchObject({
      mode: "enhanced",
      detail: {
        id: athleteId,
        photo_url: "https://storage.test/detail-photo",
        contact: { phone_e164: "+5511999999999" },
        recent_participations: [{ event_id: eventId, in_lineup: true }],
      },
    });
    if (result.mode === "enhanced") {
      expect(result.detail).not.toHaveProperty("photo_path");
    }
  });

  it("mantém o detalhe disponível com iniciais quando a mídia falha", async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: { message: "falhou" } });
    await expect(getManagementAthleteDetail(teamId, athleteId)).resolves.toMatchObject({
      mode: "enhanced",
      detail: { photo_url: null },
    });
  });

  it("não chama storage quando não existe foto autorizada", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...validPayload, photo_path: null, photo_source: null }, error: null });
    await expect(getManagementAthleteDetail(teamId, athleteId)).resolves.toMatchObject({
      mode: "enhanced",
      detail: { photo_url: null },
    });
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });

  it.each(["P0001", "42883", "PGRST202"])(
    "mantém o consumidor indisponível quando falta o contrato (%s)",
    async (code) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "indisponível" } });
      await expect(getManagementAthleteDetail(teamId, athleteId)).resolves.toEqual({ mode: "unavailable" });
    },
  );

  it.each(["42501", "22P02"])(
    "não diferencia registro ausente, UUID inválido ou acesso negado (%s)",
    async (code) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "indisponível" } });
      await expect(getManagementAthleteDetail(teamId, athleteId)).resolves.toEqual({ mode: "not_found" });
    },
  );

  it("falha explicitamente diante de erro inesperado ou projeção inválida", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "erro" } });
    await expect(getManagementAthleteDetail(teamId, athleteId)).resolves.toEqual({ mode: "error" });
    mocks.rpc.mockResolvedValueOnce({ data: { id: athleteId }, error: null });
    await expect(getManagementAthleteDetail(teamId, athleteId)).resolves.toEqual({ mode: "error" });
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });
});

describe("retorno seguro do detalhe", () => {
  const cursor = encodeManagementAthleteCursor({ sort_name: "joao", id: athleteId });

  it("preserva somente filtros válidos da lista do mesmo time", () => {
    expect(safeManagementAthleteReturnTo(
      "campo-fc",
      `/app/campo-fc/athletes?status=inactive&q=Jo%C3%A3o&position=ala&cursor=${cursor}`,
    )).toBe(`/app/campo-fc/athletes?status=inactive&q=Jo%C3%A3o&position=ALA&cursor=${cursor}`);
  });

  it.each([
    "https://evil.test/app/campo-fc/athletes",
    "//evil.test/app/campo-fc/athletes",
    "/app/outro-time/athletes?q=João",
    "/app/campo-fc/athletes?segredo=1",
    "/app/campo-fc/athletes?q=x",
    "/app/campo-fc/athletes?q=João&q=Maria",
    "/app/campo-fc/athletes#contato",
    "/app/campo-fc\\athletes",
  ])("descarta retorno externo, ambíguo ou adulterado: %s", (value) => {
    expect(safeManagementAthleteReturnTo("campo-fc", value)).toBe(
      "/app/campo-fc/athletes",
    );
  });

  it("descarta arrays vindos de parâmetros repetidos", () => {
    expect(safeManagementAthleteReturnTo("campo-fc", ["/app/campo-fc/athletes"])).toBe(
      "/app/campo-fc/athletes",
    );
  });
});
