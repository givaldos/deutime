import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/batch-actions", () => ({ lookupBatchCommand: vi.fn() }));

import { minimalPreview } from "./use-batch-recovery";

describe("dados guardados para recuperar um lote", () => {
  it("mantém somente identificador e versão dos itens", () => {
    const preview = {
      domain: "athletes" as const,
      action: "approve",
      scope: "selected" as const,
      previewed_at: "2026-10-05T12:00:00Z",
      expires_at: "2026-10-05T12:15:00Z",
      selection_hash: "a".repeat(64),
      payload: { decision: "approve" },
      item_count: 1,
      blocked_count: 0,
      items: [{ id: "11111111-1111-4111-8111-111111111111", version: "2026-10-05T12:00:00Z", name: "Nome privado", before: { phone: "+5511000000000" } }],
    };

    const saved = minimalPreview(preview);
    expect(saved.items).toEqual([{ id: "11111111-1111-4111-8111-111111111111", version: "2026-10-05T12:00:00Z" }]);
    expect(JSON.stringify(saved)).not.toContain("Nome privado");
    expect(JSON.stringify(saved)).not.toContain("+5511000000000");
  });
});
