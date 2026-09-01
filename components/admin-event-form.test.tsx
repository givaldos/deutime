import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/events/actions", () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

import { AdminEventForm } from "./admin-event-form";

const baseProps = {
  teamId: "11111111-1111-4111-8111-111111111111",
  teamSlug: "racha-do-bairro",
  teamTimezone: "America/Sao_Paulo",
  defaultSportFormat: "society" as const,
  eventControlEnabled: true,
  initialRequestId: "33333333-3333-4333-8333-333333333333",
};

describe("opções administrativas de evento", () => {
  it("oferece durações comuns, valor personalizado e todos os prazos", () => {
    const html = renderToStaticMarkup(<AdminEventForm {...baseProps} />);

    expect(html).toContain("Personalizada");
    expect(html).toContain('<option value="480">8 h</option>');
    expect(html).toContain('<option value="180">3 h antes</option>');
    expect(html).toContain('<option value="360">6 h antes</option>');
    expect(html).toContain('<option value="720">12 h antes</option>');
    expect(html).toContain('<option value="1440">1 dia antes</option>');
  });

  it("preserva e limita uma duração personalizada na edição", () => {
    const html = renderToStaticMarkup(
      <AdminEventForm
        {...baseProps}
        event={{
          id: "22222222-2222-4222-8222-222222222222",
          seriesId: "44444444-4444-4444-8444-444444444444",
          title: "Racha personalizado",
          kind: "weekly_match",
          organizationMode: "split_teams",
          sportFormat: "society",
          startsAtLocal: "2030-08-15T20:30",
          durationMinutes: "150",
          deadlineMinutes: "120",
          opponentName: "",
          venueName: "Arena Central",
          venueAddress: "Rua do Campo, 100",
        }}
      />,
    );

    expect(html).toContain('id="custom-duration"');
    expect(html).toContain('min="15"');
    expect(html).toContain('max="480"');
    expect(html).toContain('name="durationMinutes" value="150"');
  });

  it("separa jogo único de recorrência atrás da agenda profissional", () => {
    const html = renderToStaticMarkup(
      <AdminEventForm
        {...baseProps}
        professionalSchedulingEnabled
        internalSquads={[
          { id: "55555555-5555-4555-8555-555555555551", name: "Time A", color: "#0D9488", badgeKey: "stripes", sortOrder: 1 },
          { id: "55555555-5555-4555-8555-555555555552", name: "Time B", color: "#2563EB", badgeKey: "sash", sortOrder: 2 },
        ]}
        defaultHomeTeamId="55555555-5555-4555-8555-555555555551"
        defaultAwayTeamId="55555555-5555-4555-8555-555555555552"
      />,
    );

    expect(html).toContain("Este jogo acontece");
    expect(html).toContain("Uma vez");
    expect(html).toContain("Toda semana");
    expect(html).toContain("Cria uma série recorrente");
    expect(html).toContain('name="repeatWeeks" value="1"');
    expect(html).toContain("Nome do jogo");
    expect(html).toContain("Tipo do jogo");
    expect(html).toContain("Criar jogo e chamada");
    expect(html).toContain("Equipes do jogo");
    expect(html).toContain('name="homeInternalTeamId"');
    expect(html).toContain('name="awayInternalTeamId"');
    expect(html).not.toContain('<option value="championship">');
  });
});
