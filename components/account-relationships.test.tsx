import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/me/actions", () => ({
  closeMyAccount: vi.fn(),
  closeMyTeam: vi.fn(),
  declineMyTeamInvitation: vi.fn(),
  leaveMyTeam: vi.fn(),
  transferMyTeamOwnership: vi.fn(),
  withdrawMyTeamRequest: vi.fn(),
}));
vi.mock("@/components/turnstile-widget", () => ({
  TurnstileWidget: () => null,
}));

import { AccountRelationships } from "./account-relationships";

const teamId = "af100000-0000-4000-8000-000000000001";

describe("painel de vínculos e conta", () => {
  it("mostra pedido e convite próprios com ações adequadas", () => {
    const html = renderToStaticMarkup(
      <AccountRelationships
        relationships={[
          relationship("athlete", "pending"),
          relationship("invitation", "pending", false, "manager"),
        ]}
        candidatesByTeam={{}}
        enabled
        hasPassword
      />,
    );

    expect(html).toContain("R12 Mobile");
    expect(html).toContain("Retirar pedido");
    expect(html).toContain("Recusar convite");
    expect(html).not.toContain("Sair deste time");
  });

  it("bloqueia a saída do último owner e oferece as duas resoluções", () => {
    const html = renderToStaticMarkup(
      <AccountRelationships
        relationships={[relationship("membership", "active", true, "owner")]}
        candidatesByTeam={{
          [teamId]: [
            {
              user_id: "af200000-0000-4000-8000-000000000001",
              display_name: "Próxima pessoa",
              membership_role: "admin",
            },
          ],
        }}
        enabled
        hasPassword
      />,
    );

    expect(html).toContain("Você é o último proprietário");
    expect(html).toContain("Transferir");
    expect(html).toContain("Encerrar este time");
    expect(html).not.toContain("Sair deste time");
  });

  it("explica minimização e backup antes do encerramento da conta", () => {
    const html = renderToStaticMarkup(
      <AccountRelationships
        relationships={[]}
        candidatesByTeam={{}}
        enabled
        hasPassword={false}
      />,
    );

    expect(html).toContain("Encerrar minha conta");
    expect(html).toContain("histórico anônimo");
    expect(html).toContain("até 30 dias");
    expect(html).toContain("acesso sem senha");
  });
});

function relationship(
  kind: string,
  status: string,
  isLastOwner = false,
  role: string | null = null,
) {
  return {
    relationship_kind: kind,
    relationship_id: crypto.randomUUID(),
    team_id: teamId,
    team_name: "R12 Mobile",
    team_slug: "r12-mobile",
    relationship_status: status,
    relationship_role: role ?? "",
    is_last_owner: isLastOwner,
  };
}
