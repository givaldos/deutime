import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getPublicEvent: vi.fn() }));
vi.mock("@/lib/data/public-event", () => ({
  getPublicEvent: mocks.getPublicEvent,
}));

import { GET, HEAD, InviteImage } from "./route";

const publicId = "b4000000-0000-4000-8000-000000000001";
const event = {
  public_id: publicId,
  team_name: "Society United",
  team_timezone: "America/Sao_Paulo",
  title: "Treino semanal",
  kind: "training" as const,
  sport_format: "society" as const,
  starts_at: "2026-08-03T21:00:00.000Z",
  ends_at: "2026-08-03T22:00:00.000Z",
  opponent_name: null,
  status: "scheduled" as const,
};

describe("imagem pública do convite", () => {
  beforeEach(() => mocks.getPublicEvent.mockReset());

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
});
