import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicEvent: vi.fn(),
  getEventAccessContext: vi.fn(),
  getTeamLogoUrlByEventPublicId: vi.fn().mockResolvedValue(null),
  getPublicEventMatches: vi.fn().mockResolvedValue(null),
  getPublicEventLineup: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/data/public-event", () => ({
  getPublicEvent: mocks.getPublicEvent,
}));
vi.mock("@/lib/data/event-access", () => ({
  getEventAccessContext: mocks.getEventAccessContext,
}));
vi.mock("@/lib/data/team-logo", () => ({
  getTeamLogoUrlByEventPublicId: mocks.getTeamLogoUrlByEventPublicId,
}));
vi.mock("@/lib/data/public-matches", () => ({
  getPublicEventMatches: mocks.getPublicEventMatches,
}));
vi.mock("@/lib/data/public-lineup", () => ({
  getPublicEventLineup: mocks.getPublicEventLineup,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import PublicEventPage, { generateMetadata } from "./page";

const publicId = "b4000000-0000-4000-8000-000000000001";
const scheduledEvent = {
  public_id: publicId,
  team_name: "Society United",
  team_timezone: "America/Sao_Paulo",
  title: "Treino semanal",
  kind: "training" as const,
  sport_format: "society" as const,
  starts_at: "2026-08-01T21:00:00.000Z",
  ends_at: "2026-08-01T22:00:00.000Z",
  opponent_name: "Pelada do Parque",
  status: "scheduled" as const,
};

function props(id = publicId) {
  return { params: Promise.resolve({ publicId: id }) };
}

describe("public event route", () => {
  beforeEach(() => {
    mocks.getPublicEvent.mockReset();
    mocks.getEventAccessContext.mockReset();
    mocks.getEventAccessContext.mockResolvedValue({
      context: null,
      clearInvalidCookie: false,
    });
    mocks.getPublicEventLineup.mockResolvedValue(null);
  });

  it("uses the same 404 for invalid, absent and flag-filtered events", async () => {
    mocks.getPublicEvent.mockResolvedValue(null);

    await expect(PublicEventPage(props("../evento"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mocks.getPublicEvent).not.toHaveBeenCalled();

    await expect(PublicEventPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getPublicEvent).toHaveBeenCalledWith(publicId);
  });

  it.each([
    [
      "cancelled",
      "Evento cancelado",
      "Este endereço continua válido para consulta",
    ],
    [
      "completed",
      "Evento encerrado",
      "O endereço permanece como histórico",
    ],
  ] as const)(
    "keeps a %s event informative and without a mutable response",
    async (status, label, description) => {
      mocks.getPublicEvent.mockResolvedValue({ ...scheduledEvent, status });

      const html = renderToStaticMarkup(await PublicEventPage(props()));

      expect(html).toContain(label);
      expect(html).toContain(description);
      expect(html).not.toContain("SIM");
      expect(html).not.toContain("NÃO");
      expect(html).not.toContain("TALVEZ");
    },
  );

  it("publishes contextual but non-indexable metadata on the canonical URL", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);
    mocks.getEventAccessContext.mockResolvedValue({
      context: {
        athleteDisplayName: "Atleta Privado",
        attendanceStatus: "confirmed",
      },
      clearInvalidCookie: false,
    });

    const metadata = await generateMetadata(props());
    const serializedMetadata = JSON.stringify(metadata);

    expect(metadata.title).toBe("Treino semanal — Society United");
    expect(metadata.alternates).toEqual({ canonical: `/e/${publicId}` });
    expect(metadata.openGraph).toMatchObject({
      url: `/e/${publicId}`,
      title: "Treino semanal — Society United",
      images: [
        expect.objectContaining({
          url: `/e/${publicId}/convite.png`,
        }),
      ],
    });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
    expect(mocks.getEventAccessContext).not.toHaveBeenCalled();
    expect(serializedMetadata).not.toContain("Pelada do Parque");
    expect(serializedMetadata).not.toContain("Atleta Privado");
    expect(serializedMetadata).not.toContain("confirmed");
  });

  it("renders no third-party resource or private event information", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    expect(html).not.toContain("googletagmanager.com");
    expect(html).not.toContain("google-analytics.com");
    expect(html).not.toContain("venue");
    expect(html).not.toContain("attendance");
    expect(html).not.toContain("team_id");
    expect(html).not.toContain("event_id");
  });

  it("mostra somente a revisão e os primeiros nomes da projeção pública", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);
    mocks.getPublicEventLineup.mockResolvedValue({
      revision: 2,
      published_at: "2026-08-11T12:00:00Z",
      squads: [
        { name: "Verde", color: "#0D9488", sort_order: 1, athletes: [{ name: "Neymar", sort_order: 1 }] },
        { name: "Azul", color: "#2563EB", sort_order: 2, athletes: [] },
      ],
    });

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    expect(html).toContain('data-testid="public-event-lineup"');
    expect(html).toContain("Times definidos");
    expect(html).toContain("Neymar");
    expect(html).toContain("Nenhum jogador escalado");
    expect(html).toContain("revision=2");
    expect(html).not.toContain("athlete_id");
    expect(html).not.toContain("revision_id");
    expect(html).not.toContain("telefone");
  });

  it("keeps the event summary above the compact mobile header", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    expect(html).toContain('data-testid="public-event-header"');
    expect(html).toContain("pb-16 pt-5");
    expect(html).toContain('data-testid="public-event-content"');
    expect(html).toContain("relative z-10");
    expect(html).toContain("-mt-8");
    expect(html).toContain('data-testid="event-access-bootstrap"');
  });

  it("shows only the recognized athlete context from a capability", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);
    mocks.getEventAccessContext.mockResolvedValue({
      context: {
        publicId,
        athleteDisplayName: "Sem Conta",
        attendanceStatus: "pending",
        eventStatus: "scheduled",
        canRespond: false,
        expiresAt: "2026-08-20T12:00:00.000Z",
        source: "capability",
      },
      clearInvalidCookie: false,
    });

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    expect(html).toContain("Olá, Sem Conta");
    expect(html).toContain("Aguardando resposta");
    expect(html).toContain("vale somente para você neste evento");
    expect(html).not.toContain("SIM");
    expect(html).not.toContain("NÃO");
    expect(html).not.toContain("TALVEZ");
    expect(html).not.toContain("team_id");
    expect(html).not.toContain("event_id");
  });

  it("recognizes a verified device without asking for another OTP", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);
    mocks.getEventAccessContext.mockResolvedValue({
      context: {
        publicId,
        athleteDisplayName: "Atleta Verificado",
        attendanceStatus: "confirmed",
        eventStatus: "scheduled",
        canRespond: false,
        expiresAt: "2026-12-01T12:00:00.000Z",
        source: "verified_session",
      },
      clearInvalidCookie: true,
    });

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    expect(html).toContain("Olá, Atleta Verificado");
    expect(html).toContain("Confirmado");
    expect(html).toContain("não precisa repetir o código");
  });

  it("shows the three RSVP controls only when every response gate is open", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);
    mocks.getEventAccessContext.mockResolvedValue({
      context: {
        publicId,
        athleteDisplayName: "Atleta Liberado",
        attendanceStatus: "pending",
        eventStatus: "scheduled",
        canRespond: true,
        expiresAt: "2026-12-01T12:00:00.000Z",
        source: "capability",
      },
      clearInvalidCookie: false,
    });

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    // recognized-access aparece dentro do conteúdo, antes do bloco de horário
    expect(html).toContain('data-testid="recognized-event-access"');
    expect(html.indexOf('data-testid="recognized-event-access"')).toBeLessThan(
      html.indexOf("Início às"),
    );
    expect(html).toContain("SIM");
    expect(html).toContain("NÃO");
    expect(html).toContain("TALVEZ");
    expect(html).toContain('name="publicId"');
    expect(html).not.toContain("capabilitySecret");
    expect(html).not.toContain("athleteId");
    expect(html).not.toContain("teamId");
    expect(html).not.toContain("eventId");
  });

  it("keeps the current response but removes controls after event closure", async () => {
    mocks.getPublicEvent.mockResolvedValue({
      ...scheduledEvent,
      status: "cancelled",
    });
    mocks.getEventAccessContext.mockResolvedValue({
      context: {
        publicId,
        athleteDisplayName: "Atleta Reconhecido",
        attendanceStatus: "maybe",
        eventStatus: "cancelled",
        canRespond: false,
        expiresAt: "2026-12-01T12:00:00.000Z",
        source: "capability",
      },
      clearInvalidCookie: false,
    });

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    expect(html).toContain("Olá, Atleta Reconhecido");
    expect(html).toContain("Talvez");
    expect(html).toContain("Sua resposta atual continua visível");
    expect(html).toContain('href="/me/agenda"');
    expect(html).not.toContain('name="status"');
  });

  it("removes recognized athlete data when revocation invalidates the context", async () => {
    mocks.getPublicEvent.mockResolvedValue(scheduledEvent);
    mocks.getEventAccessContext.mockResolvedValue({
      context: null,
      clearInvalidCookie: true,
    });

    const html = renderToStaticMarkup(await PublicEventPage(props()));

    expect(html).not.toContain("Acesso reconhecido");
    expect(html).not.toContain("Sua confirmação");
    expect(html).not.toContain('name="status"');
    expect(html).toContain("Suas confirmações continuam na agenda");
  });
});
