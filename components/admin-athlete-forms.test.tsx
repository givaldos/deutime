import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/[teamSlug]/athletes/actions", () => ({
  createAthlete: vi.fn(),
  updateAthlete: vi.fn(),
}));

import { AdminAthleteEditForm } from "./admin-athlete-edit-form";
import { AdminAthleteForm } from "./admin-athlete-form";

const positions = [{ code: "MID", label: "Meio-campo" }];

describe("privacidade do cadastro administrativo", () => {
  it("não oferece publicação ao cadastrar atleta", () => {
    const html = renderToStaticMarkup(
      <AdminAthleteForm
        teamId="11111111-1111-4111-8111-111111111111"
        teamSlug="time-privado"
        positions={positions}
      />,
    );

    expect(html).not.toContain('name="publicProfile"');
    expect(html).not.toContain("Perfil público");
    expect(html).toContain("privado até o próprio atleta");
  });

  it("não oferece publicação ao editar identidade provisória", () => {
    const html = renderToStaticMarkup(
      <AdminAthleteEditForm
        teamSlug="time-privado"
        positions={positions}
        athlete={{
          id: "22222222-2222-4222-8222-222222222222",
          fullName: "Atleta Privado",
          preferredName: "Privado",
          shirtNumber: "8",
          birthDate: "1998-05-12",
          phone: "+5511999999999",
          email: "atleta@example.test",
          notes: "",
          positionCodes: ["MID"],
          playerOwned: false,
        }}
      />,
    );

    expect(html).not.toContain('name="publicProfile"');
    expect(html).not.toContain("Perfil público");
    expect(html).toContain("somente o atleta pode publicar");
  });
});
