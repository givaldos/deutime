import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: {
    result: {
      data: Record<string, unknown> | null;
      error: { code?: string; message?: string } | null;
    };
  } = {
    result: { data: null, error: null },
  };
  const maybeSingle = vi.fn(async () => state.result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn((fields: string) => {
    void fields;
    return { eq };
  });
  const from = vi.fn(() => ({ select }));
  const createClient = vi.fn(async () => ({ from }));

  return { state, maybeSingle, eq, select, from, createClient };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { getPublicEvent } from "./public-event";

const publicId = "b4000000-0000-4000-8000-000000000001";

describe("public event data boundary", () => {
  beforeEach(() => {
    mocks.state.result = { data: null, error: null };
    vi.clearAllMocks();
  });

  it("does not query the database for an invalid public id", async () => {
    await expect(getPublicEvent("../evento")).resolves.toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns the same absence for an unknown event or a flag-filtered event", async () => {
    await expect(getPublicEvent(publicId)).resolves.toBeNull();
    expect(mocks.from).toHaveBeenCalledWith("public_event_directory");
  });

  it("fails closed when the public contract is not available on database N-1", async () => {
    mocks.state.result = { data: null, error: { code: "42P01" } };

    await expect(
      getPublicEvent("b4000000-0000-4000-8000-000000000002"),
    ).resolves.toBeNull();
  });

  it("does not hide authorization or infrastructure failures as a 404", async () => {
    mocks.state.result = { data: null, error: { code: "42501" } };

    await expect(
      getPublicEvent("b4000000-0000-4000-8000-000000000003"),
    ).rejects.toThrow("Não foi possível carregar o evento público.");
  });

  it("reads only the anonymous projection and returns its public fields", async () => {
    mocks.state.result = {
      data: {
        public_id: publicId,
        team_name: "Society United",
        team_timezone: "America/Sao_Paulo",
        title: "Treino semanal",
        kind: "training",
        sport_format: "society",
        starts_at: "2026-08-01T21:00:00.000Z",
        ends_at: "2026-08-01T22:00:00.000Z",
        opponent_name: null,
        status: "scheduled",
      },
      error: null,
    };

    await expect(
      getPublicEvent("b4000000-0000-4000-8000-000000000004"),
    ).resolves.toMatchObject({
      team_name: "Society United",
      status: "scheduled",
    });
    expect(mocks.from).toHaveBeenCalledWith("public_event_directory");
    expect(mocks.select).toHaveBeenCalledOnce();
    const selectedFields = String(mocks.select.mock.calls[0]?.[0]);
    expect(selectedFields).not.toContain("team_id");
    expect(selectedFields).not.toContain("event_id");
    expect(selectedFields).not.toContain("venue");
    expect(selectedFields).not.toContain("attendance");
  });
});
