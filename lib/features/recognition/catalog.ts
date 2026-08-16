export const recognitionCatalogVersion = "recognition-v1" as const;

export const recognitionKinds = [
  "goal_recorded",
  "assist_recorded",
  "crowd_star",
] as const;

export type RecognitionKind = (typeof recognitionKinds)[number];

type RecognitionDefinition = {
  label: string;
  publicLabel: string;
  source: "finalized_match_event" | "closed_craque_result";
};

export const recognitionCatalog = {
  goal_recorded: {
    label: "Gol registrado",
    publicLabel: "Gols reconhecidos",
    source: "finalized_match_event",
  },
  assist_recorded: {
    label: "Assistência registrada",
    publicLabel: "Assistências reconhecidas",
    source: "finalized_match_event",
  },
  crowd_star: {
    label: "Craque da Galera",
    publicLabel: "Craques da Galera",
    source: "closed_craque_result",
  },
} as const satisfies Record<RecognitionKind, RecognitionDefinition>;
