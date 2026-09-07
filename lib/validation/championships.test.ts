import { describe, expect, it } from "vitest";

import { finishChampionshipSetupSchema } from "./championships";

const base = {
  teamId: "e9100000-0000-4000-8000-000000000001",
  teamSlug: "liga-a",
  championshipId: "e9200000-0000-4000-8000-000000000001",
  requestId: "e9300000-0000-4000-8000-000000000001",
  rosters: [
    {
      participantId: "e9400000-0000-4000-8000-000000000001",
      athleteId: "e9500000-0000-4000-8000-000000000001",
    },
  ],
  schedule: [
    {
      fixtureId: "e9600000-0000-4000-8000-000000000001",
      startsAtLocal: "2026-09-08T19:00",
    },
  ],
  sportFormat: "society",
  durationMinutes: 90,
  attendanceDeadlineMinutes: 1440,
  venueName: "Arena Central",
  venueAddress: "Rua Um, 10",
};

describe("finalização guiada do campeonato", () => {
  it("aceita convocados e agenda estreitos", () => {
    expect(finishChampionshipSetupSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita atleta repetido e confronto repetido", () => {
    const duplicated = {
      ...base,
      rosters: [...base.rosters, {
        participantId: "e9400000-0000-4000-8000-000000000002",
        athleteId: base.rosters[0]!.athleteId,
      }],
      schedule: [...base.schedule, { ...base.schedule[0] }],
    };
    const result = finishChampionshipSetupSchema.safeParse(duplicated);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "Cada atleta pode ser convocado por apenas uma equipe.",
          "Não repita um confronto na agenda.",
        ]),
      );
    }
  });
});
