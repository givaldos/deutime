import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicEvent: vi.fn(),
}));

vi.mock("@/lib/data/public-event", () => ({
  getPublicEvent: mocks.getPublicEvent,
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

    const metadata = await generateMetadata(props());

    expect(metadata.title).toBe("Treino semanal — Society United");
    expect(metadata.alternates).toEqual({ canonical: `/e/${publicId}` });
    expect(metadata.openGraph).toMatchObject({
      url: `/e/${publicId}`,
      title: "Treino semanal — Society United",
    });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
    expect(JSON.stringify(metadata)).not.toContain("Pelada do Parque");
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
});
