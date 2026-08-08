import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  hideMatchCommentAction,
  restoreMatchCommentAction,
} from "./conversation-actions";

const values = {
  eventId: "07300000-0000-4000-8000-000000000001",
  teamSlug: "campo-fc",
  commentId: "07500000-0000-4000-8000-000000000001",
};

function form(reason = "Mensagem desrespeitosa") {
  const data = new FormData();
  data.set("eventId", values.eventId);
  data.set("teamSlug", values.teamSlug);
  data.set("commentId", values.commentId);
  data.set("reason", reason);
  return data;
}

describe("ações administrativas da conversa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "staff" });
  });

  it("delega ocultação sem aceitar time, ator ou corpo do cliente", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    await expect(hideMatchCommentAction({}, form())).resolves.toEqual({
      outcome: "success",
      message: "Comentário ocultado.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("moderate_match_comment", {
      requested_comment_id: values.commentId,
      requested_reason: "Mensagem desrespeitosa",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/app/${values.teamSlug}/events/${values.eventId}/matches`,
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/me/agenda/${values.eventId}`,
    );
  });

  it("delega restauração com o motivo validado", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    await expect(
      restoreMatchCommentAction({}, form("Revisão concluída")),
    ).resolves.toMatchObject({ outcome: "success" });
    expect(mocks.rpc).toHaveBeenCalledWith("restore_match_comment", {
      requested_comment_id: values.commentId,
      requested_reason: "Revisão concluída",
    });
  });

  it("rejeita motivo inválido antes do banco", async () => {
    await expect(hideMatchCommentAction({}, form("x"))).resolves.toMatchObject({
      outcome: "invalid",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["42501", "55000"])("falha fechado para erro %s", async (code) => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code, message: "detalhe interno" },
    });

    await expect(hideMatchCommentAction({}, form())).resolves.toEqual({
      outcome: "unavailable",
      message: "Este comentário não está disponível para esta decisão.",
    });
  });
});
