import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createAthlete, updateAthlete } from "./actions";

const athleteId = "22222222-2222-4222-8222-222222222222";
const teamId = "11111111-1111-4111-8111-111111111111";

function athleteForm(mode: "create" | "update") {
  const form = new FormData();
  if (mode === "create") form.set("teamId", teamId);
  if (mode === "update") {
    form.set("athleteId", athleteId);
    form.set("profileOwner", "team");
    form.set("notes", "Cadastro interno");
  }
  form.set("teamSlug", "time-privado");
  form.set("fullName", "Atleta Privado");
  form.set("preferredName", "Privado");
  form.set("shirtNumber", "8");
  form.set("birthDate", "1998-05-12");
  form.set("phone", "+5511999999999");
  form.set("email", "atleta@example.test");
  form.set("publicProfile", "on");
  form.append("positionCodes", "MID");
  return form;
}

describe("Actions administrativas de atleta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "staff-r12" });
    mocks.rpc.mockResolvedValue({ data: athleteId, error: null });
  });

  it("ignora publicação manipulada ao cadastrar", async () => {
    await createAthlete({}, athleteForm("create"));

    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_athlete_as_staff",
      expect.not.objectContaining({ athlete_public_profile: true }),
    );
    expect(mocks.rpc.mock.calls[0]?.[1]).not.toHaveProperty(
      "athlete_public_profile",
    );
  });

  it("força privacidade ao editar com um cliente antigo", async () => {
    await updateAthlete({}, athleteForm("update"));

    expect(mocks.rpc).toHaveBeenCalledWith(
      "update_athlete_as_admin",
      expect.objectContaining({ athlete_public_profile: false }),
    );
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "update_athlete_as_admin",
      expect.objectContaining({ athlete_public_profile: true }),
    );
  });
});
