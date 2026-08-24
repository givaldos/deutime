import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountProfileLink } from "./account-profile-link";

describe("AccountProfileLink", () => {
  it("mantém o perfil pós-login visível em um alvo de toque de 44px", () => {
    const html = renderToStaticMarkup(<AccountProfileLink />);

    expect(html).toContain('href="/app/profile"');
    expect(html).toContain('aria-label="Editar perfil"');
    expect(html).toContain("size-11");
  });
});
