import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  featureEnabled: false,
  isTeamFeatureEnabled: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/features/delivery/server", () => ({
  isTeamFeatureEnabled: mocks.isTeamFeatureEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { getMatchConversationModeration } from "./match-conversation-moderation";

const teamId = "07100000-0000-4000-8000-000000000001";
const eventId = "07300000-0000-4000-8000-000000000001";

describe("fronteira de dados da moderação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTeamFeatureEnabled.mockResolvedValue(mocks.featureEnabled);
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  it("não consulta a fila quando comments está desligada", async () => {
    await expect(
      getMatchConversationModeration(teamId, eventId),
    ).resolves.toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("projeta a fila sem identidade técnica do denunciante", async () => {
    mocks.featureEnabled = true;
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);
    mocks.rpc.mockResolvedValue({
      data: [
        {
          match_id: "07400000-0000-4000-8000-000000000001",
          match_ordinal: 1,
          comment_id: "07500000-0000-4000-8000-000000000001",
          parent_comment_id: null,
          author_display_name: "Bia",
          body: "Mensagem em análise",
          status: "active",
          created_at: "2026-08-08T20:00:00.000Z",
          moderation_reason: null,
          report_count: 2,
          report_reasons: ["Ofensa", "Ataque pessoal"],
        },
      ],
      error: null,
    });

    await expect(
      getMatchConversationModeration(teamId, eventId),
    ).resolves.toEqual([
      {
        matchId: "07400000-0000-4000-8000-000000000001",
        matchOrdinal: 1,
        commentId: "07500000-0000-4000-8000-000000000001",
        parentCommentId: null,
        authorName: "Bia",
        body: "Mensagem em análise",
        status: "active",
        createdAt: "2026-08-08T20:00:00.000Z",
        moderationReason: null,
        reportCount: 2,
        reportReasons: ["Ofensa", "Ataque pessoal"],
      },
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "get_match_conversation_moderation",
      { requested_event_id: eventId },
    );
  });

  it("falha fechado quando o contrato ainda não está disponível", async () => {
    mocks.featureEnabled = true;
    mocks.isTeamFeatureEnabled.mockResolvedValue(true);
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });

    await expect(
      getMatchConversationModeration(teamId, eventId),
    ).resolves.toBeNull();
  });
});
