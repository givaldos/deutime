import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/profile/actions", () => ({
  updateMyAccountProfile: vi.fn(),
}));

import { AccountProfileForm } from "./account-profile-form";

describe("AccountProfileForm", () => {
  it("expõe a edição de nome com ajuda móvel e envio acessível", () => {
    const html = renderToStaticMarkup(
      <AccountProfileForm displayName="Maria da Silva" />,
    );

    expect(html).toContain('name="displayName"');
    expect(html).toContain('value="Maria da Silva"');
    expect(html).toContain('autoComplete="name"');
    expect(html).toContain("Salvar alterações");
    expect(html).toContain("w-full");
  });
});
