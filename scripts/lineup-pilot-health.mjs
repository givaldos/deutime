import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const countFields = [
  "scheduled_events",
  "draft_events",
  "draft_squads",
  "draft_assignments",
  "draft_exclusions",
  "active_revisions",
  "published_squads",
  "published_assignments",
  "consented_published_assignments",
  "publications_24h",
  "withdrawals_24h",
];

export async function runLineupPilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectEnabled = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("LINEUP_PILOT_TEAM_ID deve ser um UUID canônico.");
  }

  const endpoint = new URL(
    "/rest/v1/rpc/get_event_lineup_pilot_health",
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
      `Sonda operacional da divisão de times indisponível: HTTP ${response.status}.`,
    );
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Sonda operacional da divisão de times não encontrou a coorte.");
  }

  const health = normalizeHealth(rows[0]);
  if (
    expectEnabled &&
    (!health.team_division_enabled || !health.public_event_page_enabled)
  ) {
    throw new Error(
      "Piloto de divisão deveria estar ativo, mas ao menos um gate está desligado.",
    );
  }
  if (health.consented_published_assignments > health.published_assignments) {
    throw new Error("Sonda operacional da divisão de times retornou contrato inválido.");
  }

  return health;
}

function normalizeHealth(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Sonda operacional da divisão de times retornou contrato inválido.");
  }
  for (const field of ["team_division_enabled", "public_event_page_enabled"]) {
    if (typeof value[field] !== "boolean") {
      throw new Error("Sonda operacional da divisão de times retornou contrato inválido.");
    }
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Sonda operacional da divisão de times retornou contrato inválido.");
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
  const health = await runLineupPilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("LINEUP_PILOT_TEAM_ID"),
    expectEnabled: process.env.EXPECT_LINEUP_PILOT_ENABLED === "true",
  });
  console.log(JSON.stringify({ status: "Sonda operacional da divisão concluída.", ...health }, null, 2));
}
