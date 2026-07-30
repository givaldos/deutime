import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  respondToEventFromAccess: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/event-access", () => ({
  respondToEventFromAccess: mocks.respondToEventFromAccess,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { respondToPublicEventFromAccess } from "./actions";

const publicId = "b4000000-0000-4000-8000-000000000001";

function responseForm(status: string, id = publicId) {
  const formData = new FormData();
  formData.set("publicId", id);
  formData.set("status", status);
  return formData;
}

describe("public event RSVP action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates and delegates only the public id and allowed status", async () => {
    mocks.respondToEventFromAccess.mockResolvedValue({
      outcome: "success",
      status: "confirmed",
    });

    await expect(
      respondToPublicEventFromAccess({}, responseForm("confirmed")),
    ).resolves.toEqual({
      outcome: "success",
      message: "Presença atualizada: Confirmado.",
      status: "confirmed",
    });
    expect(mocks.respondToEventFromAccess).toHaveBeenCalledWith(
      publicId,
      "confirmed",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/e/${publicId}`);
  });

  it.each(["pending", "waitlist", "confirmed ", ""])(
    "rejects the unsupported status %j before the data boundary",
    async (status) => {
      const state = await respondToPublicEventFromAccess(
        {},
        responseForm(status),
      );

      expect(state.outcome).toBe("unavailable");
      expect(mocks.respondToEventFromAccess).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("uses the same read-only fallback for an invalid public id", async () => {
    const state = await respondToPublicEventFromAccess(
      {},
      responseForm("confirmed", "../outro"),
    );

    expect(state).toMatchObject({ outcome: "unavailable" });
    expect(mocks.respondToEventFromAccess).not.toHaveBeenCalled();
  });

  it("returns a generic fallback when access or the N-1 contract is unavailable", async () => {
    mocks.respondToEventFromAccess.mockResolvedValue({
      outcome: "unavailable",
    });

    const state = await respondToPublicEventFromAccess(
      {},
      responseForm("maybe"),
    );

    expect(state).toEqual({
      outcome: "unavailable",
      message:
        "Sua resposta não pode ser alterada por este link agora. Consulte a agenda para continuar.",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/e/${publicId}`);
  });

  it("allows retry after an unexpected transient failure", async () => {
    mocks.respondToEventFromAccess.mockResolvedValue({ outcome: "error" });

    await expect(
      respondToPublicEventFromAccess({}, responseForm("declined")),
    ).resolves.toEqual({
      outcome: "error",
      message: "Não foi possível salvar agora. Tente novamente.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
