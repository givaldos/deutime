import { describe, expect, it } from "vitest";

import {
  getChampionshipCreationStep,
  shouldUseProfessionalCreationActions,
} from "./presentation";

describe("apresentação da entrada profissional", () => {
  it.each(["owner", "admin"])(
    "libera as duas ações para %s com as dependências ativas",
    (role) => {
      expect(
        shouldUseProfessionalCreationActions({
          role,
          professionalSchedulingEnabled: true,
          championshipsEnabled: true,
        }),
      ).toBe(true);
    },
  );

  it("mantém o fallback para manager", () => {
    expect(
      shouldUseProfessionalCreationActions({
        role: "manager",
        professionalSchedulingEnabled: true,
        championshipsEnabled: true,
      }),
    ).toBe(false);
  });

  it("mantém o fallback quando qualquer flag está desligada", () => {
    expect(
      shouldUseProfessionalCreationActions({
        role: "owner",
        professionalSchedulingEnabled: false,
        championshipsEnabled: true,
      }),
    ).toBe(false);
    expect(
      shouldUseProfessionalCreationActions({
        role: "owner",
        professionalSchedulingEnabled: true,
        championshipsEnabled: false,
      }),
    ).toBe(false);
  });

  it("reconstrói a etapa do campeonato a partir do rascunho persistido", () => {
    expect(
      getChampionshipCreationStep({
        status: "draft",
        participantCount: 0,
        fixtureCount: 0,
      }),
    ).toBe(2);
    expect(
      getChampionshipCreationStep({
        status: "draft",
        participantCount: 2,
        fixtureCount: 0,
      }),
    ).toBe(5);
    expect(
      getChampionshipCreationStep({
        status: "draft",
        participantCount: 2,
        fixtureCount: 1,
      }),
    ).toBe(6);
    expect(
      getChampionshipCreationStep({
        status: "published",
        participantCount: 2,
        fixtureCount: 1,
      }),
    ).toBe(7);
  });
});
