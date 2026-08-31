import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const booleanFields = [
  "team_open",
  "account_autonomy_enabled",
  "registration_email_alerts_enabled",
  "registration_email_delivery_enabled",
];
const countFields = [
  "pending_account_closures",
  "stalled_account_closures",
  "pending_team_storage_jobs",
  "failed_team_storage_jobs",
  "pending_email_events",
  "pending_email_deliveries",
  "failed_email_deliveries",
  "review_email_deliveries",
  "lifecycle_commands_24h",
  "registration_email_commands_24h",
];
const timestampFields = [
  "observed_at",
  "last_control_change_at",
  "last_lifecycle_command_at",
  "last_registration_email_command_at",
];

export async function runR12PilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectAccountAutonomy = false,
  expectEmailAlerts = false,
  expectEmailDelivery = false,
  expectLifecycleActivity = false,
  expectEmailActivity = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("R12_PILOT_TEAM_ID deve ser um UUID canônico.");
  }
  if (expectEmailDelivery && !expectEmailAlerts) {
    throw new Error(
      "O consumo de avisos só pode ser exigido com a produção ativa.",
    );
  }

  const endpoint = new URL("/rest/v1/rpc/get_r12_pilot_health", supabaseUrl);
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
    throw new Error(`Sonda operacional da R12 indisponível: HTTP ${response.status}.`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Sonda operacional da R12 não encontrou a coorte.");
  }

  const health = normalizeHealth(rows[0]);
  if (!health.team_open) {
    throw new Error("A coorte sintética da R12 está encerrada.");
  }

  requireExpectedState(
    health.account_autonomy_enabled,
    expectAccountAutonomy,
    "autonomia de conta",
  );
  requireExpectedState(
    health.registration_email_alerts_enabled,
    expectEmailAlerts,
    "produção de avisos",
  );
  requireExpectedState(
    health.registration_email_delivery_enabled,
    expectEmailDelivery,
    "consumo de avisos",
  );

  if (
    health.stalled_account_closures > 0 ||
    health.failed_team_storage_jobs > 0 ||
    health.review_email_deliveries > 0
  ) {
    throw new Error("Sonda operacional da R12 detectou item que exige intervenção.");
  }
  if (expectLifecycleActivity && health.lifecycle_commands_24h < 1) {
    throw new Error("Piloto da R12 não registrou atividade recente de autonomia.");
  }
  if (
    expectEmailActivity &&
    health.registration_email_commands_24h < 1 &&
    health.pending_email_events < 1 &&
    health.pending_email_deliveries < 1
  ) {
    throw new Error("Piloto da R12 não registrou atividade recente de aviso.");
  }

  return health;
}

function requireExpectedState(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Sonda operacional da R12 esperava ${label} ${expected ? "ativa" : "desligada"}.`,
    );
  }
}

function normalizeHealth(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Sonda operacional da R12 retornou contrato inválido.");
  }

  for (const field of booleanFields) {
    if (typeof value[field] !== "boolean") {
      throw new Error("Sonda operacional da R12 retornou contrato inválido.");
    }
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Sonda operacional da R12 retornou contrato inválido.");
    }
    health[field] = count;
  }
  for (const field of timestampFields) {
    if (
      value[field] !== null &&
      (typeof value[field] !== "string" || !Number.isFinite(Date.parse(value[field])))
    ) {
      throw new Error("Sonda operacional da R12 retornou contrato inválido.");
    }
  }

  return health;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const health = await runR12PilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("R12_PILOT_TEAM_ID"),
    expectAccountAutonomy: process.env.EXPECT_R12_ACCOUNT_AUTONOMY === "true",
    expectEmailAlerts: process.env.EXPECT_R12_EMAIL_ALERTS === "true",
    expectEmailDelivery: process.env.EXPECT_R12_EMAIL_DELIVERY === "true",
    expectLifecycleActivity: process.env.EXPECT_R12_LIFECYCLE_ACTIVITY === "true",
    expectEmailActivity: process.env.EXPECT_R12_EMAIL_ACTIVITY === "true",
  });

  console.log(
    JSON.stringify(
      { status: "Sonda operacional da R12 concluída.", ...health },
      null,
      2,
    ),
  );
}
