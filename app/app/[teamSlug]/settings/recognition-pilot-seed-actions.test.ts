import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  teamSingle: vi.fn(),
  membershipSingle: vi.fn(),
  athleteSingle: vi.fn(),
  ownerRpc: vi.fn(),
  privilegedRpc: vi.fn(),
  createUser: vi.fn(),
  listUsers: vi.fn(),
  updateUserById: vi.fn(),
  signInWithPassword: vi.fn(),
  athleteRpc: vi.fn(),
  revalidatePath: vi.fn(),
  info: vi.fn(),
}));

function query(single: ReturnType<typeof vi.fn>) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: single,
  };
  return chain;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/env/public", () => ({
  getPublicEnv: vi.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key-long-enough",
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn((table: string) =>
      table === "teams"
        ? query(mocks.teamSingle)
        : query(mocks.membershipSingle)),
    rpc: mocks.ownerRpc,
  })),
}));
vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: vi.fn(() => ({
    rpc: mocks.privilegedRpc,
    auth: {
      admin: {
        createUser: mocks.createUser,
        listUsers: mocks.listUsers,
        updateUserById: mocks.updateUserById,
      },
    },
  })),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
    rpc: mocks.athleteRpc,
    from: vi.fn(() => query(mocks.athleteSingle)),
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { prepareRecognitionPilotAthlete } from "./recognition-pilot-actions";

const teamId = "c8100000-0000-4000-8000-000000000010";
const athleteId = "a8100000-0000-4000-8000-000000000010";
const userId = "u8100000-0000-4000-8000-000000000010";

function seedForm(confirmed = true) {
  const form = new FormData();
  form.set("teamSlug", "r10-demo-reconhecimentos");
  if (confirmed) form.set("confirmation", "confirmed");
  return form;
}

const activeHealth = [{
  recognition_enabled: true,
  activation_captured: true,
  projected_cards: 0,
  public_cards: 0,
  reconstruction_mismatches: 0,
}];

describe("preparação do atleta sintético R10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "owner" });
    mocks.teamSingle.mockResolvedValue({
      data: { id: teamId, slug: "r10-demo-reconhecimentos" },
      error: null,
    });
    mocks.membershipSingle.mockResolvedValue({
      data: { role: "owner", status: "active" },
      error: null,
    });
    mocks.privilegedRpc.mockResolvedValue({ data: activeHealth, error: null });
    mocks.createUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          phone: "+15550100010",
          email: "r10-pilot-athlete@example.test",
          user_metadata: { pilot_tag: "r10_recognition_pilot_v1" },
        },
      },
      error: null,
    });
    mocks.updateUserById.mockResolvedValue({ error: null });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.athleteRpc.mockImplementation((name: string) =>
      name === "complete_verified_athlete_registration"
        ? Promise.resolve({ data: athleteId, error: null })
        : Promise.resolve({ data: "r10-sintetico", error: null }));
    mocks.athleteSingle.mockResolvedValue({
      data: { status: "pending" },
      error: null,
    });
    mocks.ownerRpc.mockResolvedValue({ data: "active", error: null });
    vi.spyOn(console, "info").mockImplementation(mocks.info);
  });

  it("cria perfil, aprova o vínculo e confirma pela sonda", async () => {
    await expect(prepareRecognitionPilotAthlete({}, seedForm())).resolves.toEqual({
      outcome: "success",
      message: "Atleta e perfil sintéticos prontos para os fatos esportivos.",
    });
    expect(mocks.ownerRpc).toHaveBeenCalledWith(
      "review_athlete_registration",
      { requested_athlete_id: athleteId, decision: "approve" },
    );
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "r10-pilot-athlete@example.test",
      password: expect.stringMatching(/^R10!/),
    });
    expect(mocks.info).toHaveBeenCalledWith(
      "recognition_pilot.synthetic_athlete_ready",
      { ready: true },
    );
  });

  it("nega antes do cliente privilegiado quando não é owner ou admin", async () => {
    mocks.membershipSingle.mockResolvedValue({
      data: { role: "manager", status: "active" },
      error: null,
    });
    await expect(prepareRecognitionPilotAthlete({}, seedForm())).resolves.toEqual({
      outcome: "error",
      message: "Somente owner ou admin pode preparar o piloto.",
    });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("recupera a identidade etiquetada em páginas posteriores do Auth", async () => {
    mocks.createUser.mockResolvedValue({ data: { user: null }, error: { code: "phone_exists" } });
    mocks.listUsers
      .mockResolvedValueOnce({
        data: { users: Array.from({ length: 1_000 }, (_, index) => ({
          id: `outro-${index}`,
          user_metadata: {},
        })) },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { users: [{
          id: userId,
          phone: "+15550100010",
          user_metadata: { pilot_tag: "r10_recognition_pilot_v1" },
        }] },
        error: null,
      });
    await expect(prepareRecognitionPilotAthlete({}, seedForm())).resolves.toMatchObject({
      outcome: "success",
    });
    expect(mocks.listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1_000 });
  });

  it("exige confirmação explícita antes de qualquer consulta", async () => {
    await expect(prepareRecognitionPilotAthlete({}, seedForm(false))).resolves.toMatchObject({
      outcome: "error",
    });
    expect(mocks.teamSingle).not.toHaveBeenCalled();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
