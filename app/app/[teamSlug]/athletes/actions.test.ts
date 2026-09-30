import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isTeamFeatureEnabled: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: mocks.isTeamFeatureEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  applyAthleteBatchReview,
  createAthlete,
  previewAthleteBatchReview,
  updateAthlete,
} from "./actions";

const athleteId = "22222222-2222-4222-8222-222222222222";
const teamId = "11111111-1111-4111-8111-111111111111";
const requestId = "33333333-3333-4333-8333-333333333333";

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
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);
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

  it("confere uma aprovação explícita antes de salvar", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        domain: "athletes",
        action: "approve",
        scope: "selected",
        previewed_at: "2026-09-29T12:00:00.000Z",
        expires_at: "2026-09-29T12:15:00.000Z",
        selection_hash: "a".repeat(64),
        item_count: 1,
        blocked_count: 0,
        items: [{ id: athleteId, name: "Atleta Privado", version: "2026-09-29T11:00:00.000Z", eligible: true }],
      },
      error: null,
    });

    const result = await previewAthleteBatchReview({
      teamId,
      selection: { mode: "explicit", ids: [athleteId] },
      decision: "approve",
    });

    expect(result).toMatchObject({ outcome: "preview", preview: { payload: { decision: "approve" } } });
    expect(mocks.rpc).toHaveBeenCalledWith("preview_athlete_review_batch", expect.objectContaining({
      requested_athlete_ids: [athleteId],
      requested_decision: "approve",
    }));
  });

  it("confirma a prévia idempotente e atualiza elenco e jogos", async () => {
    mocks.rpc.mockResolvedValue({ data: { applied_count: 2, replayed: false }, error: null });
    const preview = {
      domain: "athletes" as const,
      action: "reject",
      scope: "selected" as const,
      previewed_at: "2026-09-29T12:00:00.000Z",
      expires_at: "2099-09-29T12:15:00.000Z",
      selection_hash: "b".repeat(64),
      payload: { decision: "reject" },
      item_count: 1,
      blocked_count: 0,
      items: [{ id: athleteId, version: "2026-09-29T11:00:00.000Z", eligible: true }],
    };

    const result = await applyAthleteBatchReview({ teamId, teamSlug: "time-privado", requestId, preview });

    expect(result).toMatchObject({ outcome: "success", appliedCount: 2, replayed: false });
    expect(mocks.rpc).toHaveBeenCalledWith("apply_athlete_review_batch", expect.objectContaining({ request_id: requestId }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/time-privado/athletes");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/time-privado/events");
  });

  it("mantém o caminho individual quando o lote está desligado", async () => {
    mocks.isTeamFeatureEnabled.mockResolvedValue(false);

    const result = await previewAthleteBatchReview({
      teamId,
      selection: { mode: "explicit", ids: [athleteId] },
      decision: "approve",
    });

    expect(result).toMatchObject({ outcome: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
