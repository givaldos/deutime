import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isTeamFeatureEnabled: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: mocks.isTeamFeatureEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { saveInternalSquads } from "./internal-squad-actions";

const ids = {
  team: "d7200000-0000-4000-8000-000000000001",
  request: "d7500000-0000-4000-8000-000000000001",
  squadA: "d7600000-0000-4000-8000-000000000001",
  squadB: "d7600000-0000-4000-8000-000000000002",
};

function validForm() {
  const form = new FormData();
  form.set("teamId", ids.team);
  form.set("teamSlug", "society-united");
  form.set("requestId", ids.request);
  form.set("squads", JSON.stringify([
    { id: ids.squadA, name: "Azul", color: "#0D9488", badge_key: "stripes", sort_order: 1 },
    { id: ids.squadB, name: "Branco", color: "#2563EB", badge_key: "sash", sort_order: 2 },
  ]));
  return form;
}

describe("equipes internas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "owner" });
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);
  });

  it("valida catálogo e delega a escrita para a RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { preset_count: 2, replayed: false }, error: null });
    await expect(saveInternalSquads({}, validForm())).resolves.toMatchObject({
      outcome: "success",
      message: "2 equipes internas prontas para os próximos jogos.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("replace_team_squad_presets", {
      requested_team_id: ids.team,
      request_id: ids.request,
      requested_presets: expect.arrayContaining([
        expect.objectContaining({ badge_key: "stripes" }),
      ]),
    });
  });

  it("falha fechado quando a capacidade está desligada", async () => {
    mocks.isTeamFeatureEnabled.mockResolvedValue(false);
    await expect(saveInternalSquads({}, validForm())).resolves.toMatchObject({
      outcome: "error",
      message: expect.stringContaining("desligada"),
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
