import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/app/[teamSlug]/events/actions", () => ({
  previewEventBatchOperation: vi.fn(),
  applyEventBatchOperation: vi.fn(),
}));

import { buildEventBatchOperation, EventBatchManager } from "./event-batch-manager";

const event = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Jogo de terça",
  kind: "friendly" as const,
  sport_format: "society" as const,
  starts_at: "2026-10-06T22:00:00.000Z",
  ends_at: "2026-10-06T23:00:00.000Z",
  status: "scheduled" as const,
  professional_schedule_state: "scheduled" as const,
  venue_name: "Arena Central",
  confirmed_count: 8,
  attendance_count: 12,
  match_count: 1,
  championships: [],
  internal_teams: [],
  reschedule_reason: null,
  next_action: "Abrir jogo",
};

describe("seleção de jogos em lote", () => {
  it("renderiza o fallback de navegação antes de entrar no modo de seleção", () => {
    const html = renderToStaticMarkup(<EventBatchManager events={[event]} returnTo="/app/campo-fc/events" teamId="11111111-1111-4111-8111-111111111111" teamSlug="campo-fc" timeZone="America/Sao_Paulo" venues={[]} />);
    expect(html).toContain("Selecionar");
    expect(html).toContain("Jogo de terça");
    expect(html).toContain("returnTo=%2Fapp%2Fcampo-fc%2Fevents");
  });

  it("valida os valores e transições disponíveis", () => {
    const venueId = "33333333-3333-4333-8333-333333333333";
    expect(buildEventBatchOperation("shift_time", "60")).toEqual({ action: "shift_time", offsetMinutes: 60 });
    expect(buildEventBatchOperation("shift_time", "0")).toBeNull();
    expect(buildEventBatchOperation("set_local_time", "20:30")).toEqual({ action: "set_local_time", localTime: "20:30" });
    expect(buildEventBatchOperation("set_venue", venueId)).toEqual({ action: "set_venue", venueId });
    expect(buildEventBatchOperation("set_venue", "local-invalido")).toBeNull();
    expect(buildEventBatchOperation("set_duration", "90")).toEqual({ action: "set_duration", durationMinutes: 90 });
    expect(buildEventBatchOperation("postpone", "")).toEqual({ action: "postpone" });
    expect(buildEventBatchOperation("date_tbd", "")).toEqual({ action: "date_tbd" });
    expect(buildEventBatchOperation("cancel", "")).toEqual({ action: "cancel" });
  });
});
