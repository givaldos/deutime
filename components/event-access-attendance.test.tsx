import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/e/[publicId]/actions", () => ({
  respondToPublicEventFromAccess: vi.fn(),
}));

import { EventAccessAttendance } from "./event-access-attendance";

const publicId = "b4000000-0000-4000-8000-000000000001";

describe("event access attendance", () => {
  it("renders three touch-friendly responses behind canRespond", () => {
    const html = renderToStaticMarkup(
      <EventAccessAttendance
        publicId={publicId}
        currentStatus="pending"
        canRespond
      />,
    );

    expect(html).toContain('name="publicId"');
    expect(html).toContain(`value="${publicId}"`);
    expect(html).toContain('value="confirmed"');
    expect(html).toContain('value="declined"');
    expect(html).toContain('value="maybe"');
    expect(html).toContain("SIM");
    expect(html).toContain("NÃO");
    expect(html).toContain("TALVEZ");
    expect(html).toContain("min-h-14");
    expect(html).not.toContain("capability");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("teamId");
    expect(html).not.toContain("eventId");
    expect(html).not.toContain("athleteId");
  });

  it("keeps the current response visible and falls back to the agenda", () => {
    const html = renderToStaticMarkup(
      <EventAccessAttendance
        publicId={publicId}
        currentStatus="confirmed"
        canRespond={false}
      />,
    );

    expect(html).toContain("Confirmado");
    expect(html).toContain("Sua resposta atual continua visível");
    expect(html).toContain('href="/me/agenda"');
    expect(html).not.toContain('name="status"');
  });
});
