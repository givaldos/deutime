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

import { createTeam } from "./actions";

function teamForm(slug: string) {
  const form = new FormData();
  form.set("name", "Time do Bairro");
  form.set("slug", slug);
  form.set("sportFormat", "society");
  return form;
}

describe("criação de time", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-r12" });
    mocks.rpc.mockResolvedValue({ data: "time-do-bairro", error: null });
  });

  it("normaliza letras e preserva o mesmo slug enviado à RPC", async () => {
    await createTeam({}, teamForm(" TIME-DO-BAIRRO "));

    expect(mocks.rpc).toHaveBeenCalledWith("create_team_for_current_user", {
      team_name: "Time do Bairro",
      team_slug: "time-do-bairro",
      sport_format: "society",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/app/time-do-bairro?created=1",
    );
  });

  it("rejeita hífen repetido sem chamar o banco", async () => {
    await expect(
      createTeam({}, teamForm("time--do-bairro")),
    ).resolves.toMatchObject({
      message: "Revise os campos indicados.",
      errors: { slug: expect.any(Array) },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
