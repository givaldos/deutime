import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const booleanFields = [
  "team_open",
  "professional_scheduling_enabled",
  "whatsapp_delivery_enabled",
  "integration_produce_enabled",
  "integration_consume_enabled",
  "configuration_complete",
];
const countFields = [
  "active_internal_teams",
  "upcoming_events",
  "scheduled_events",
  "pending_review_events",
  "date_tbd_events",
  "postponed_events",
  "pending_conflicts",
  "hard_conflicts",
  "warning_conflicts",
  "stale_conflicts",
  "schedule_state_mismatches",
  "accepted_exceptions_24h",
  "commands_24h",
  "notifications_pending",
  "notifications_processing",
  "notifications_failed",
  "notifications_sent_24h",
];
const timestampFields = ["observed_at", "last_flag_change_at", "last_decision_at"];

export async function runR13PilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectProfessionalScheduling = false,
  expectNotificationDelivery = false,
  expectActivity = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("R13_PILOT_TEAM_ID deve ser um UUID canônico.");
  }
  if (expectNotificationDelivery && !expectProfessionalScheduling) {
    throw new Error("A entrega só pode ser exigida com o piloto profissional ativo.");
  }

  const endpoint = new URL("/rest/v1/rpc/get_r13_pilot_health", supabaseUrl);
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
    throw new Error(`Sonda operacional da R13 indisponível: HTTP ${response.status}.`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Sonda operacional da R13 não encontrou a coorte.");
  }

  const health = normalizeHealth(rows[0]);
  if (!health.team_open) {
    throw new Error("A coorte da R13 está encerrada.");
  }
  if (health.professional_scheduling_enabled !== expectProfessionalScheduling) {
    throw new Error(
      `Sonda operacional da R13 esperava agenda profissional ${expectProfessionalScheduling ? "ativa" : "desligada"}.`,
    );
  }

  if (expectProfessionalScheduling) {
    if (
      !health.configuration_complete ||
      health.active_internal_teams < 2 ||
      health.active_internal_teams > 12
    ) {
      throw new Error("Piloto da R13 está sem duas equipes padrão válidas.");
    }
    if (
      health.stale_conflicts > 0 ||
      health.schedule_state_mismatches > 0 ||
      health.notifications_failed > 0
    ) {
      throw new Error("Sonda operacional da R13 detectou item que exige intervenção.");
    }
  }

  if (
    expectNotificationDelivery &&
    (!health.whatsapp_delivery_enabled ||
      !health.integration_produce_enabled ||
      !health.integration_consume_enabled)
  ) {
    throw new Error("Entrega do piloto da R13 não está integralmente habilitada.");
  }
  if (expectActivity && health.commands_24h < 1) {
    throw new Error("Piloto da R13 não registrou atividade recente.");
  }

  return health;
}

function normalizeHealth(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Sonda operacional da R13 retornou contrato inválido.");
  }
  for (const field of booleanFields) {
    if (typeof value[field] !== "boolean") {
      throw new Error("Sonda operacional da R13 retornou contrato inválido.");
    }
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Sonda operacional da R13 retornou contrato inválido.");
    }
    health[field] = count;
  }
  for (const field of timestampFields) {
    if (
      value[field] !== null &&
      (typeof value[field] !== "string" || !Number.isFinite(Date.parse(value[field])))
    ) {
      throw new Error("Sonda operacional da R13 retornou contrato inválido.");
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
  const health = await runR13PilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("R13_PILOT_TEAM_ID"),
    expectProfessionalScheduling:
      process.env.EXPECT_R13_PROFESSIONAL_SCHEDULING === "true",
    expectNotificationDelivery:
      process.env.EXPECT_R13_NOTIFICATION_DELIVERY === "true",
    expectActivity: process.env.EXPECT_R13_ACTIVITY === "true",
  });

  console.log(JSON.stringify({
    status: "Sonda operacional da R13 concluída.",
    ...health,
  }, null, 2));
}
