import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isTeamFeatureEnabled: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  reportEventControlFailure: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: mocks.isTeamFeatureEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("@/lib/observability/event-control", () => ({
  reportEventControlFailure: mocks.reportEventControlFailure,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  createEvent,
  resolveEventScheduleConflict,
  transitionEventSchedule,
  updateEvent,
} from "./actions";

const ids = {
  team: "11111111-1111-4111-8111-111111111111",
  event: "22222222-2222-4222-8222-222222222222",
  request: "33333333-3333-4333-8333-333333333333",
};

function eventForm(mode: "create" | "update" = "create") {
  const form = new FormData();
  form.set("teamId", ids.team);
  form.set("teamSlug", "racha-do-bairro");
  form.set("title", "Racha de quinta");
  form.set("kind", "weekly_match");
  form.set("organizationMode", "split_teams");
  form.set("sportFormat", "society");
  form.set("requestId", ids.request);
  form.set("startsAtLocal", "2030-08-15T20:30");
  form.set("durationMinutes", "150");
  form.set("deadlineMinutes", "720");
  form.set("opponentName", "");
  form.set("venueName", "Arena Central");
  form.set("venueAddress", "Rua do Campo, 100");

  if (mode === "create") {
    form.set("repeatWeeks", "4");
  } else {
    form.set("eventId", ids.event);
    form.set("editScope", "this_and_future");
  }

  return form;
}

describe("ações das opções de evento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "staff" });
    mocks.isTeamFeatureEnabled.mockImplementation(async (_teamId, feature) =>
      feature === "event_control"
    );
  });

  it("usa o contrato profissional com os dois lados escolhidos", async () => {
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);
    mocks.rpc.mockResolvedValue({
      data: { event_id: ids.event, affected_count: 1 },
      error: null,
    });
    const form = eventForm();
    form.set("homeInternalTeamId", "44444444-4444-4444-8444-444444444441");
    form.set("awayInternalTeamId", "44444444-4444-4444-8444-444444444442");
    form.set("venueExclusive", "false");

    await createEvent({}, form);

    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_event_as_staff_v5",
      expect.objectContaining({
        requested_home_internal_team_id: "44444444-4444-4444-8444-444444444441",
        requested_away_internal_team_id: "44444444-4444-4444-8444-444444444442",
        requested_venue_exclusive: false,
      }),
    );
  });

  it("delega criação recorrente ao contrato v3", async () => {
    mocks.rpc.mockResolvedValue({
      data: { event_id: ids.event, affected_count: 4 },
      error: null,
    });

    await createEvent({}, eventForm());

    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_event_as_staff_v3",
      expect.objectContaining({
        event_duration_minutes: 150,
        attendance_deadline_minutes: 720,
        repeat_weeks: 4,
      }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/app/racha-do-bairro/events/${ids.event}?created=1`,
    );
  });

  it("usa v2 somente durante a janela em que v3 ainda não existe", async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST202", message: "schema cache" },
      })
      .mockResolvedValueOnce({
        data: { event_id: ids.event, affected_count: 4 },
        error: null,
      });

    await createEvent({}, eventForm());

    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      "create_event_as_staff_v3",
      expect.any(Object),
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "create_event_as_staff_v2",
      expect.any(Object),
    );
    expect(mocks.reportEventControlFailure).not.toHaveBeenCalled();
  });

  it("não contorna uma rejeição de limites feita por v3", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "22023", message: "limite inválido" },
    });

    await expect(createEvent({}, eventForm())).resolves.toMatchObject({
      message: expect.stringContaining("limites do evento"),
    });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_event_as_staff_v3",
      expect.any(Object),
    );
    expect(mocks.reportEventControlFailure).toHaveBeenCalledOnce();
  });

  it("delega edição da série ao contrato v3", async () => {
    mocks.rpc.mockResolvedValue({
      data: { event_id: ids.event, affected_count: 4 },
      error: null,
    });

    await updateEvent({}, eventForm("update"));

    expect(mocks.rpc).toHaveBeenCalledWith(
      "update_event_as_staff_v3",
      expect.objectContaining({
        requested_event_id: ids.event,
        edit_scope: "this_and_future",
        event_duration_minutes: 150,
        attendance_deadline_minutes: 720,
      }),
    );
  });

  it("delega edição profissional ao contrato v4 e preserva exclusividade", async () => {
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);
    mocks.rpc.mockResolvedValue({
      data: { event_id: ids.event, affected_count: 1 },
      error: null,
    });
    const form = eventForm("update");
    form.set("venueExclusive", "true");

    await updateEvent({}, form);

    expect(mocks.rpc).toHaveBeenCalledWith(
      "update_event_as_staff_v4",
      expect.objectContaining({ requested_venue_exclusive: true }),
    );
  });

  it("delega a decisão de conflito usando somente identificadores validados", async () => {
    mocks.rpc.mockResolvedValue({ data: { pending_count: 0 }, error: null });
    const form = new FormData();
    form.set("teamId", ids.team);
    form.set("teamSlug", "racha-do-bairro");
    form.set("eventId", ids.event);
    form.set("conflictId", "44444444-4444-4444-8444-444444444444");
    form.set("requestId", ids.request);
    form.set("decision", "confirm_warning");

    await resolveEventScheduleConflict(form);

    expect(mocks.rpc).toHaveBeenCalledWith(
      "resolve_event_schedule_conflict",
      expect.objectContaining({
        requested_team_id: ids.team,
        requested_event_id: ids.event,
      }),
    );
  });

  it("delega adiamento com alcance explícito", async () => {
    mocks.rpc.mockResolvedValue({ data: { affected_count: 1 }, error: null });
    const form = new FormData();
    form.set("teamId", ids.team);
    form.set("teamSlug", "racha-do-bairro");
    form.set("eventId", ids.event);
    form.set("requestId", ids.request);
    form.set("transition", "postpone");
    form.set("scope", "single_event");

    await transitionEventSchedule(form);

    expect(mocks.rpc).toHaveBeenCalledWith(
      "transition_event_schedule",
      expect.objectContaining({ requested_transition: "postpone" }),
    );
  });
});
