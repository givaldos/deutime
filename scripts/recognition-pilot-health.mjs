import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const booleanFields = ["recognition_enabled", "activation_captured"];
const countFields = [
  "active_claimed_athletes",
  "source_cards",
  "source_goal_cards",
  "source_assist_cards",
  "source_crowd_star_cards",
  "projected_cards",
  "projected_goal_cards",
  "projected_assist_cards",
  "projected_crowd_star_cards",
  "reconstruction_mismatches",
  "granted_consents",
  "revoked_consents",
  "public_cards",
  "consent_commands_24h",
];
const timestampFields = [
  "observed_at",
  "last_consent_command_at",
  "last_flag_change_at",
  "activated_at",
];

export async function runRecognitionPilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectEnabled = false,
  expectProjection = false,
  expectPublicSummary = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("RECOGNITION_PILOT_TEAM_ID deve ser um UUID canônico.");
  }
  if ((expectProjection || expectPublicSummary) && !expectEnabled) {
    throw new Error(
      "Projeção e resumo público só podem ser exigidos com recognition ativa.",
    );
  }

  const endpoint = new URL(
    "/rest/v1/rpc/get_recognition_pilot_health",
    supabaseUrl,
  );
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ requested_team_id: teamId }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Sonda operacional de reconhecimentos indisponível: HTTP ${response.status}.`,
    );
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      "Sonda operacional de reconhecimentos não encontrou a coorte.",
    );
  }

  const health = normalizeHealth(rows[0]);
  if (expectEnabled) {
    if (!health.recognition_enabled || !health.activation_captured) {
      throw new Error(
        "Piloto de reconhecimentos deveria estar ativo, mas flag ou ativação estão ausentes.",
      );
    }
  } else if (health.recognition_enabled) {
    throw new Error(
      "Piloto de reconhecimentos deveria estar desligado, mas a flag está ativa.",
    );
  }

  if (
    health.reconstruction_mismatches > 0 ||
    (health.recognition_enabled &&
      health.projected_cards !== health.source_cards) ||
    (!health.recognition_enabled &&
      (health.projected_cards > 0 || health.public_cards > 0))
  ) {
    throw new Error(
      "Sonda operacional de reconhecimentos detectou projeção ou rollback divergente.",
    );
  }

  if (expectProjection && health.projected_cards < 1) {
    throw new Error(
      "Piloto ativo não possui reconhecimentos projetados para observação.",
    );
  }
  if (
    expectPublicSummary &&
    (health.granted_consents < 1 || health.public_cards < 1)
  ) {
    throw new Error(
      "Piloto ativo não possui resumo público consentido para observação.",
    );
  }

  return health;
}

function normalizeHealth(value) {
  if (!value || typeof value !== "object") {
    throw new Error(
      "Sonda operacional de reconhecimentos retornou contrato inválido.",
    );
  }

  for (const field of booleanFields) {
    if (typeof value[field] !== "boolean") {
      throw new Error(
        "Sonda operacional de reconhecimentos retornou contrato inválido.",
      );
    }
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(
        "Sonda operacional de reconhecimentos retornou contrato inválido.",
      );
    }
    health[field] = count;
  }
  for (const field of timestampFields) {
    if (
      value[field] !== null &&
      (typeof value[field] !== "string" ||
        !Number.isFinite(Date.parse(value[field])))
    ) {
      throw new Error(
        "Sonda operacional de reconhecimentos retornou contrato inválido.",
      );
    }
  }

  if (
    health.source_cards !==
      health.source_goal_cards +
        health.source_assist_cards +
        health.source_crowd_star_cards ||
    health.projected_cards !==
      health.projected_goal_cards +
        health.projected_assist_cards +
        health.projected_crowd_star_cards ||
    health.public_cards > health.projected_cards ||
    (health.activation_captured && health.activated_at === null) ||
    (!health.activation_captured && health.activated_at !== null)
  ) {
    throw new Error(
      "Sonda operacional de reconhecimentos retornou contrato inválido.",
    );
  }

  return health;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const health = await runRecognitionPilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("RECOGNITION_PILOT_TEAM_ID"),
    expectEnabled: process.env.EXPECT_RECOGNITION_ENABLED === "true",
    expectProjection: process.env.EXPECT_RECOGNITION_PROJECTION === "true",
    expectPublicSummary:
      process.env.EXPECT_RECOGNITION_PUBLIC_SUMMARY === "true",
  });

  console.log(
    JSON.stringify(
      {
        status: "Sonda operacional de reconhecimentos concluída.",
        ...health,
      },
      null,
      2,
    ),
  );
}
