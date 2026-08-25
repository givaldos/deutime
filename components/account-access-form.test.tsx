import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/profile/actions", () => ({
  updateMyAccountEmail: vi.fn(),
  updateMyAccountPassword: vi.fn(),
}));

import { AccountAccessForm } from "./account-access-form";

describe("AccountAccessForm", () => {
  it("expõe edição de e-mail e senha com autocomplete adequado", () => {
    const html = renderToStaticMarkup(
      <AccountAccessForm currentEmail="atual@example.com" />,
    );

    expect(html).toContain("atual@example.com");
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(html).toContain("Alterar e-mail");
    expect(html).toContain('name="currentPassword"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('name="password"');
    expect(html).toContain('name="repeatPassword"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain("Alterar senha");
  });
});
