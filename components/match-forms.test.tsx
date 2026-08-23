import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/app/app/[teamSlug]/events/[eventId]/matches/match-actions",
  () => ({
    createMatchAction: vi.fn(),
    recordEventAction: vi.fn(),
    setParticipationAction: vi.fn(),
  }),
);

import { RecordEventForm } from "./match-forms";

describe("súmula explícita", () => {
  it("envia a assistência opcional para a RPC de lances", () => {
    const html = renderToStaticMarkup(
      <RecordEventForm
        teamSlug="r10-demo-reconhecimentos"
        matchId="c0400000-0000-4000-8000-000000000001"
        sides={[
          { id: "c0400000-0000-4000-8000-000000000002", label: "Time A", side_index: 1 },
          { id: "c0400000-0000-4000-8000-000000000003", label: "Time B", side_index: 2 },
        ]}
        athletes={[
          { id: "c0400000-0000-4000-8000-000000000004", name: "Apoio" },
          { id: "c0400000-0000-4000-8000-000000000005", name: "Sintético" },
        ]}
      />,
    );

    expect(html).toContain("Assistência (opcional)");
    expect(html).toContain('name="assistAthleteId"');
    expect(html).toContain("Sem assistência");
    expect(html).toContain("Sintético");
  });
});
