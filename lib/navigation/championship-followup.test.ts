import { describe, expect, it } from "vitest";
import {
  buildChampionshipFollowupUrl,
  parseChampionshipFollowupSection,
  safeChampionshipFollowupReturnTo,
} from "./championship-followup";

describe("navegação do acompanhamento de campeonato", () => {
  it("normaliza seção ausente, repetida ou inválida para Resumo", () => {
    expect(parseChampionshipFollowupSection(undefined)).toBe("summary");
    expect(parseChampionshipFollowupSection(["matches", "teams"])).toBe("summary");
    expect(parseChampionshipFollowupSection("estatisticas")).toBe("summary");
  });

  it("aceita somente as cinco seções publicadas", () => {
    for (const section of ["summary", "matches", "standings", "teams", "regulation"]) {
      expect(parseChampionshipFollowupSection(section)).toBe(section);
    }
  });

  it("mantém Resumo como URL canônica e preserva o retorno da lista", () => {
    expect(buildChampionshipFollowupUrl({
      teamSlug: "campo-fc",
      championshipId: "championship-a",
      section: "summary",
      returnTo: "/app/campo-fc/championships?status=active",
    })).toBe(
      "/app/campo-fc/championships/championship-a?returnTo=%2Fapp%2Fcampo-fc%2Fchampionships%3Fstatus%3Dactive",
    );
  });

  it("coloca a seção secundária na URL", () => {
    expect(buildChampionshipFollowupUrl({
      teamSlug: "campo-fc",
      championshipId: "championship-a",
      section: "matches",
    })).toBe("/app/campo-fc/championships/championship-a?section=matches");
  });

  it("aceita retorno somente para Jogos do mesmo time e rejeita endereço externo", () => {
    const valid = "/app/campo-fc/championships/22222222-2222-4222-8222-222222222222?section=matches&round=2";
    expect(safeChampionshipFollowupReturnTo("campo-fc", valid)).toBe(valid);
    expect(safeChampionshipFollowupReturnTo("campo-fc", valid.replace("campo-fc", "outro"))).toBeNull();
    expect(safeChampionshipFollowupReturnTo("campo-fc", `https://malicioso.example${valid}`)).toBeNull();
    expect(safeChampionshipFollowupReturnTo("campo-fc", valid.replace("matches", "teams"))).toBeNull();
  });
});
