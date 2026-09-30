import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/app/[teamSlug]/athletes/actions", () => ({
  previewAthleteBatchReview: vi.fn(),
  applyAthleteBatchReview: vi.fn(),
  reviewAthlete: vi.fn(),
  setAthleteAvailability: vi.fn(),
  removeAthlete: vi.fn(),
}));

import { AthleteBatchReviewManager } from "./athlete-batch-review-manager";

const athlete = {
  id: "22222222-2222-4222-8222-222222222222",
  registration_number: 42,
  claimed: true,
  display_name: "João Jota",
  full_name: "João da Silva",
  shirt_number: 10,
  status: "pending" as const,
  positions: [],
  photo_source: null,
  photo_url: null,
  allowed_actions: { can_review: true, can_edit: true, can_remove: true },
};

describe("análise de atletas em lote", () => {
  it("preserva a lista individual antes de iniciar a seleção", () => {
    const html = renderToStaticMarkup(<AthleteBatchReviewManager
      athletes={[athlete]}
      teamId="11111111-1111-4111-8111-111111111111"
      teamSlug="campo-fc"
      returnUrl="/app/campo-fc/athletes?status=pending"
    />);

    expect(html).toContain("Abra um cadastro ou analise vários de uma vez");
    expect(html).toContain("Selecionar");
    expect(html).toContain("João Jota");
    expect(html).toContain("Aprovar");
    expect(html).toContain("Rejeitar");
  });
});
