import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  mode: "enhanced" as "enhanced" | "unavailable" | "not_found" | "error",
  manager: false,
}));

const athleteId = "22222222-2222-4222-8222-222222222222";
const eventId = "33333333-3333-4333-8333-333333333333";
const detail = {
  id: athleteId,
  registration_number: 42,
  claimed: true,
  display_name: "João Jota",
  full_name: "João da Silva",
  shirt_number: 10,
  status: "active" as const,
  registration_source: "admin" as const,
  joined_on: "2026-01-10",
  created_at: "2026-01-10T12:00:00+00:00",
  contact: {
    birth_date: "1990-05-20",
    phone_e164: "+5511999999999",
    email: "jota@example.test",
    notes: "Contato privado",
  },
  positions: [{ sport_format: "society" as const, code: "ALA", label: "Ala", priority: 1 }],
  photo_source: "player_profile" as const,
  photo_url: "https://storage.test/detail-photo.webp",
  recent_participations: [{
    event_id: eventId,
    title: "Amistoso encerrado",
    kind: "friendly" as const,
    starts_at: "2026-09-01T18:00:00+00:00",
    status: "completed" as const,
    attendance_status: "confirmed" as const,
    in_lineup: true,
  }],
  sports_statistics_available: false as const,
  allowed_actions: {
    can_review: false,
    can_edit: true,
    can_remove: true,
    can_change_availability: true,
  },
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "user-a" })) }));
vi.mock("@/app/app/[teamSlug]/athletes/actions", () => ({
  reviewAthlete: vi.fn(),
  setAthleteAvailability: vi.fn(),
  removeAthlete: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/lib/data/management-athlete-detail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/management-athlete-detail")>();
  return {
    ...actual,
    getManagementAthleteDetail: vi.fn(async () => state.mode === "enhanced"
      ? {
          mode: "enhanced",
          detail: state.manager
            ? { ...detail, allowed_actions: { can_review: false, can_edit: false, can_remove: false, can_change_availability: false } }
            : detail,
        }
      : { mode: state.mode }),
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: () => createTeamQuery() })),
}));

import ManagementAthleteDetailPage from "./page";

function createTeamQuery() {
  const query: Record<string, unknown> = {};
  query.select = () => query;
  query.eq = () => query;
  query.maybeSingle = async () => ({
    data: { id: "team-a", name: "Campo FC", slug: "campo-fc", timezone: "America/Sao_Paulo" },
    error: null,
  });
  return query;
}

function props(returnTo?: string | string[]) {
  return {
    params: Promise.resolve({ teamSlug: "campo-fc", athleteId }),
    searchParams: Promise.resolve(returnTo === undefined ? {} : { returnTo }),
  };
}

beforeEach(() => {
  state.mode = "enhanced";
  state.manager = false;
});

describe("detalhe privado do atleta", () => {
  it("mostra cadastro, PII autorizada, posições e participação factual", async () => {
    const html = renderToStaticMarkup(await ManagementAthleteDetailPage(props(
      "/app/campo-fc/athletes?status=inactive&q=João&position=ALA",
    )));

    expect(html).toContain("João Jota");
    expect(html).toContain("Foto de João Jota");
    expect(html).toContain("Contato privado");
    expect(html).toContain("+5511999999999");
    expect(html).toContain("jota@example.test");
    expect(html).toContain("Amistoso encerrado");
    expect(html).toContain("Presença confirmada");
    expect(html).toContain("Na escalação");
    expect(html).toContain("Nenhum número é estimado");
    expect(html).toContain("Editar cadastro");
    expect(html).toContain("status=inactive&amp;q=Jo%C3%A3o&amp;position=ALA");
    expect(html).not.toContain("photo_path");
  });

  it("mantém manager em modo somente leitura", async () => {
    state.manager = true;
    const html = renderToStaticMarkup(await ManagementAthleteDetailPage(props()));
    expect(html).toContain("Consulta em modo somente leitura");
    expect(html).toContain("Contato privado");
    expect(html).not.toContain("Editar cadastro");
    expect(html).not.toContain("Marcar como inativo");
  });

  it("mantém retorno e lista disponíveis quando a RPC ainda não existe", async () => {
    state.mode = "unavailable";
    const html = renderToStaticMarkup(await ManagementAthleteDetailPage(props(
      "/app/campo-fc/athletes?status=pending",
    )));
    expect(html).toContain("Detalhes temporariamente indisponíveis");
    expect(html).toContain("status=pending");
  });

  it("falha fechado para registro ausente ou acesso negado", async () => {
    state.mode = "not_found";
    await expect(ManagementAthleteDetailPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("oferece retry sem propagar retorno externo", async () => {
    state.mode = "error";
    const html = renderToStaticMarkup(await ManagementAthleteDetailPage(props(
      "https://evil.test/roubo",
    )));
    expect(html).toContain("Não foi possível carregar o atleta");
    expect(html).toContain("returnTo=%2Fapp%2Fcampo-fc%2Fathletes");
    expect(html).not.toContain("evil.test");
  });
});
