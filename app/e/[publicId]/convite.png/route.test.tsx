import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicEvent: vi.fn(),
  getTeamLogoUrlByEventPublicId: vi.fn().mockResolvedValue(null),
  getPublicEventLineup: vi.fn().mockResolvedValue(null),
  createPrivilegedClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(() => Promise.resolve({ data: null })),
      })),
    },
  })),
}));

vi.mock("@/lib/data/public-event", () => ({
  getPublicEvent: mocks.getPublicEvent,
}));
vi.mock("@/lib/data/team-logo", () => ({
  getTeamLogoUrlByEventPublicId: mocks.getTeamLogoUrlByEventPublicId,
  getTeamLogoPngDataUrlByEventPublicId: mocks.getTeamLogoUrlByEventPublicId,
}));
vi.mock("@/lib/data/public-lineup", () => ({
  getPublicEventLineup: mocks.getPublicEventLineup,
}));
vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: mocks.createPrivilegedClient,
}));

import { InviteImage } from "./invite-image";
import { GET, HEAD } from "./route";

const publicId = "b4000000-0000-4000-8000-000000000001";
const event = {
  public_id: publicId,
  team_name: "Society United",
  team_timezone: "America/Sao_Paulo",
  team_logo_url: null as string | null,
  title: "Treino semanal",
  kind: "training" as const,
  sport_format: "society" as const,
  starts_at: "2026-08-03T21:00:00.000Z",
  ends_at: "2026-08-03T22:00:00.000Z",
  opponent_name: null,
  status: "scheduled" as const,
};

describe("imagem pública do convite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getPublicEvent.mockReset();
    mocks.getPublicEventLineup.mockResolvedValue(null);
  });

  it("renderiza somente o contexto esportivo público do evento", () => {
    const html = renderToStaticMarkup(<InviteImage event={event} />);
    expect(html).toContain("Society United");
    expect(html).toContain("Treino semanal");
    // data em destaque: dia numérico, mês abreviado e dia da semana por extenso
    expect(html).toContain("03");
    expect(html).toContain("ago");
    expect(html).toContain("segunda-feira");
    expect(html).toContain("às 18:00");
    expect(html).toContain("logo-deutime-email-640-fundo-escuro.png");
    expect(html).not.toContain(">DT<");
    expect(html).not.toContain("opponent");
    expect(html).not.toContain("attendance");
    expect(html).not.toContain("athlete");
  });

  it("exibe logo do time quando fornecido e inicial quando ausente", () => {
    const withLogo = renderToStaticMarkup(
      <InviteImage event={event} teamLogoUrl="https://cdn.example.com/logo.png" />,
    );
    expect(withLogo).toContain("https://cdn.example.com/logo.png");

    const withoutLogo = renderToStaticMarkup(<InviteImage event={event} />);
    // fallback mostra a inicial do time
    expect(withoutLogo).toContain("S"); // inicial de "Society United"
  });

  it("mantém fallback genérico sem consultar ID inválido", async () => {
    const response = await GET(new Request("https://deutime.app"), {
      params: Promise.resolve({ publicId: "../segredo" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(mocks.getPublicEvent).not.toHaveBeenCalled();
  });

  it("responde HEAD como PNG público para validação da Twilio", async () => {
    const response = await HEAD();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age=300");
  });

  it("renderiza a revisão com primeiros nomes sem IDs e desliga cache compartilhado", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const lineup = {
      revision: 3,
      published_at: "2026-08-11T12:00:00Z",
      squads: [
        { name: "Verde", color: "#0D9488", sort_order: 1, athletes: [{ name: "Neymar", sort_order: 1 }] },
        { name: "Azul", color: "#2563EB", sort_order: 2, athletes: [] },
      ],
    };
    const html = renderToStaticMarkup(<InviteImage event={event} lineup={lineup} />);
    expect(html).toContain("Times definidos");
    expect(html).toContain("Neymar");
    expect(html).toContain("Sem jogadores escalados");
    expect(html).toContain("background:#167252");
    expect(html).not.toContain("athlete_id");
    expect(html).not.toContain("revision_id");

    mocks.getPublicEvent.mockResolvedValue(event);
    mocks.getPublicEventLineup.mockResolvedValue(lineup);
    const response = await GET(new Request(`https://deutime.app/e/${publicId}/convite.png?revision=3`), {
      params: Promise.resolve({ publicId }),
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(info).toHaveBeenCalledWith("event_lineup_image.rendered", {
      revision: 3,
      squadCount: 2,
      namedAthleteCount: 1,
    });
    expect(JSON.stringify(info.mock.calls)).not.toContain(publicId);
    expect(JSON.stringify(info.mock.calls)).not.toContain("Neymar");
  });

  it("registra falha redigida e preserva a imagem genérica", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getPublicEvent.mockResolvedValue(event);
    mocks.getPublicEventLineup.mockRejectedValue(new Error("telefone=+5511999999999"));

    const response = await GET(new Request(`https://deutime.app/e/${publicId}/convite.png`), {
      params: Promise.resolve({ publicId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("public");
    expect(error).toHaveBeenCalledWith("event_lineup_image.failed", {
      reason: "projection_unavailable",
    });
    expect(JSON.stringify(error.mock.calls)).not.toContain("+5511999999999");
    expect(JSON.stringify(error.mock.calls)).not.toContain(publicId);
  });
});
