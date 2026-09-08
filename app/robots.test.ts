import { describe, expect, it } from "vitest";
import robots from "./robots";

type RuleList = { allow?: string | string[]; disallow?: string | string[] };

function asList(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function rules(): RuleList[] {
  const { rules } = robots();
  const list = Array.isArray(rules) ? rules : [rules];
  return list as RuleList[];
}

describe("robots.txt", () => {
  it("bloqueia áreas autenticadas, tokens públicos e APIs", () => {
    const disallow = rules().flatMap((rule) => asList(rule.disallow));

    for (const prefix of [
      "/api/",
      "/app/",
      "/auth/",
      "/c/",
      "/e/",
      "/invite/",
      "/me/",
    ]) {
      expect(disallow).toContain(prefix);
    }
  });

  it("mantém a vitrine e os perfis públicos rastreáveis", () => {
    const allow = rules().flatMap((rule) => asList(rule.allow));

    expect(allow).toContain("/");
  });
});
