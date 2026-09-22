import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const countFields = ["scheduled_events", "reschedule_events", "pending_conflicts"];

export async function runCalendarWorkspacePilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectEnabled = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("CALENDAR_WORKSPACE_PILOT_TEAM_ID deve ser um UUID canônico.");
  }

  const endpoint = new URL("/rest/v1/rpc/get_calendar_workspace_health", supabaseUrl);
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
    throw new Error(`Sonda do calendário indisponível: HTTP ${response.status}.`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Sonda do calendário não encontrou a coorte.");
  }

  const health = normalizeHealth(rows[0]);
  if (!health.team_open) {
    throw new Error("A coorte do calendário está encerrada.");
  }
  if (health.calendar_workspace_enabled !== expectEnabled) {
    throw new Error(
      `Sonda esperava calendário ${expectEnabled ? "ativo" : "desligado"}.`,
    );
  }
  if (expectEnabled && health.last_flag_change_at === null) {
    throw new Error("A ativação do calendário não possui marco operacional.");
  }
  return health;
}

function normalizeHealth(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.team_open !== "boolean" ||
    typeof value.calendar_workspace_enabled !== "boolean"
  ) {
    throw new Error("Sonda do calendário retornou contrato inválido.");
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Sonda do calendário retornou contrato inválido.");
    }
    health[field] = count;
  }
  for (const field of ["observed_at", "last_flag_change_at"]) {
    if (
      value[field] !== null &&
      (typeof value[field] !== "string" || !Number.isFinite(Date.parse(value[field])))
    ) {
      throw new Error("Sonda do calendário retornou contrato inválido.");
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
  const health = await runCalendarWorkspacePilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("CALENDAR_WORKSPACE_PILOT_TEAM_ID"),
    expectEnabled: process.env.EXPECT_CALENDAR_WORKSPACE_ENABLED === "true",
  });

  console.log(JSON.stringify({
    status: "Sonda do calendário concluída.",
    ...health,
  }, null, 2));
}
