import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isTeamFeatureEnabled: vi.fn(),
  info: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: mocks.isTeamFeatureEnabled,
}));

import { isProfessionalSchedulingEnabled } from "./server";

describe("gate server-side da agenda profissional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(mocks.info);
  });

  it("aceita a primeira leitura positiva sem consulta duplicada", async () => {
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);

    await expect(
      isProfessionalSchedulingEnabled("team-id"),
    ).resolves.toBe(true);
    expect(mocks.isTeamFeatureEnabled).toHaveBeenCalledOnce();
    expect(mocks.isTeamFeatureEnabled).toHaveBeenCalledWith(
      "team-id",
      "professional_scheduling",
    );
  });

  it("recupera uma leitura negativa transitória sem expor o time", async () => {
    mocks.isTeamFeatureEnabled
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(
      isProfessionalSchedulingEnabled("team-id"),
    ).resolves.toBe(true);
    expect(mocks.info).toHaveBeenCalledWith(
      "professional_scheduling_feature_lookup.recovered",
    );
  });

  it("permanece desligado depois de duas leituras negativas", async () => {
    mocks.isTeamFeatureEnabled.mockResolvedValue(false);

    await expect(
      isProfessionalSchedulingEnabled("team-id"),
    ).resolves.toBe(false);
    expect(mocks.isTeamFeatureEnabled).toHaveBeenCalledTimes(2);
    expect(mocks.info).not.toHaveBeenCalled();
  });
});
