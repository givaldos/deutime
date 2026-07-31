import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const countFields = [
  "active_credentials",
  "active_capability_sessions",
  "capability_sessions_created_24h",
  "capability_sessions_revoked_24h",
  "rsvp_writes_24h",
];

export async function runRsvpPilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectEnabled = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("RSVP_PILOT_TEAM_ID deve ser um UUID canônico.");
  }

  const endpoint = new URL(
    "/rest/v1/rpc/get_event_capability_pilot_health",
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
      `Sonda operacional do RSVP indisponível: HTTP ${response.status}.`,
    );
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Sonda operacional do RSVP não encontrou a coorte.");
  }

  const health = normalizeHealth(rows[0]);
  if (
    expectEnabled &&
    (!health.global_exchange_enabled ||
      !health.team_exchange_enabled ||
      !health.team_rsvp_enabled)
  ) {
    throw new Error(
      "Piloto RSVP deveria estar ativo, mas ao menos um gate está desligado.",
    );
  }

  return health;
}

function normalizeHealth(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Sonda operacional do RSVP retornou contrato inválido.");
  }

  for (const field of [
    "global_exchange_enabled",
    "team_exchange_enabled",
    "team_rsvp_enabled",
  ]) {
    if (typeof value[field] !== "boolean") {
      throw new Error("Sonda operacional do RSVP retornou contrato inválido.");
    }
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Sonda operacional do RSVP retornou contrato inválido.");
    }
    health[field] = count;
  }

  return health;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const health = await runRsvpPilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("RSVP_PILOT_TEAM_ID"),
    expectEnabled: process.env.EXPECT_RSVP_PILOT_ENABLED === "true",
  });

  console.log(
    JSON.stringify(
      {
        status: "Sonda operacional do RSVP concluída.",
        ...health,
      },
      null,
      2,
    ),
  );
}
