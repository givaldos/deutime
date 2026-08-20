import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { updateMyRecognitionSummaryConsent } from "./actions";

const userId = "d1100000-0000-4000-8000-000000000001";
const athleteId = "d1300000-0000-4000-8000-000000000001";
const requestId = "d1800000-0000-4000-8000-000000000001";

describe("updateMyRecognitionSummaryConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: userId });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    mocks.from.mockReturnValue(
      createProfileQuery({ data: { handle: "atleta-r10" }, error: null }),
    );
    mocks.createClient.mockResolvedValue({
      rpc: mocks.rpc,
      from: mocks.from,
    });
  });

  it("valida e delega a concessão à RPC derivada da sessão", async () => {
    await expect(
      updateMyRecognitionSummaryConsent(
        consentForm({ granted: "true" }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/me/perfil/editar?recognitionConsent=granted",
    );

    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "set_public_recognition_summary_consent",
      {
        requested_athlete_id: athleteId,
        requested_granted: true,
        requested_terms_version: "r10-v1",
        request_id: requestId,
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/atleta-r10");
  });

  it("revoga somente a fatia pública pelo mesmo contrato", async () => {
    await expect(
      updateMyRecognitionSummaryConsent(
        consentForm({ granted: "false" }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/me/perfil/editar?recognitionConsent=revoked",
    );

    expect(mocks.rpc).toHaveBeenCalledWith(
      "set_public_recognition_summary_consent",
      expect.objectContaining({ requested_granted: false }),
    );
  });

  it("falha antes do banco para entrada inválida e fecha quando a RPC nega", async () => {
    await expect(
      updateMyRecognitionSummaryConsent(
        consentForm({ athleteId: "outro-time" }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/me/perfil/editar?recognitionConsent=error",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "42501" },
    });
    await expect(
      updateMyRecognitionSummaryConsent(
        consentForm({ granted: "true" }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/me/perfil/editar?recognitionConsent=error",
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

function consentForm(
  overrides: Partial<{
    athleteId: string;
    granted: string;
    requestId: string;
  }> = {},
) {
  const formData = new FormData();
  formData.set("athleteId", overrides.athleteId ?? athleteId);
  formData.set("granted", overrides.granted ?? "true");
  formData.set("requestId", overrides.requestId ?? requestId);
  return formData;
}

function createProfileQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}
