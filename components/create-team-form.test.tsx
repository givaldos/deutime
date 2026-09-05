import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/new-team/actions", () => ({
  createTeam: vi.fn(),
}));

import { CreateTeamForm } from "./create-team-form";

describe("formulário de criação de time", () => {
  it("exibe o convite sem autocomplete durante o pré-lançamento", () => {
    const html = renderToStaticMarkup(<CreateTeamForm inviteOnly />);

    expect(html).toContain("Código de convite");
    expect(html).toContain('name="inviteCode"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain("XXXX-XXXX-XXXX-XXXX");
    expect(html).toContain("required");
  });

  it("remove o campo imediatamente quando o controle é desligado", () => {
    const html = renderToStaticMarkup(<CreateTeamForm inviteOnly={false} />);

    expect(html).not.toContain('name="inviteCode"');
    expect(html).not.toContain("Código de convite");
    expect(html).toContain("Criar time e continuar");
  });
});
