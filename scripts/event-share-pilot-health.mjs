import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const booleanFields = [
  "event_share_card_enabled",
  "public_event_page_enabled",
  "event_matches_enabled",
  "voting_enabled",
];

const countFields = [
  "window_events",
  "projected_events",
  "fallback_events",
  "call_events",
  "lineup_events",
  "live_events",
  "voting_events",
  "result_events",
  "score_events",
  "cancelled_events",
  "completed_events",
];

const phaseCountFields = countFields.slice(3);

export async function runEventSharePilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectEnabled = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("EVENT_SHARE_PILOT_TEAM_ID deve ser um UUID canônico.");
  }

  const endpoint = new URL(
    "/rest/v1/rpc/get_event_share_card_pilot_health",
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
      `Sonda operacional do cartão público indisponível: HTTP ${response.status}.`,
    );
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Sonda operacional do cartão público não encontrou a coorte.");
  }

  const health = normalizeHealth(rows[0]);
  if (expectEnabled) {
    if (
      !health.event_share_card_enabled ||
      !health.public_event_page_enabled
    ) {
      throw new Error(
        "Piloto do cartão público deveria estar ativo, mas ao menos um gate está desligado.",
      );
    }
  } else if (health.event_share_card_enabled) {
    throw new Error(
      "Piloto do cartão público deveria estar desligado, mas a flag está ativa.",
    );
  }

  return health;
}

function normalizeHealth(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Sonda operacional do cartão público retornou contrato inválido.");
  }

  for (const field of booleanFields) {
    if (typeof value[field] !== "boolean") {
      throw new Error("Sonda operacional do cartão público retornou contrato inválido.");
    }
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Sonda operacional do cartão público retornou contrato inválido.");
    }
    health[field] = count;
  }

  const phaseTotal = phaseCountFields.reduce(
    (total, field) => total + health[field],
    0,
  );
  if (
    health.projected_events + health.fallback_events !== health.window_events ||
    phaseTotal !== health.projected_events
  ) {
    throw new Error("Sonda operacional do cartão público retornou contrato inválido.");
  }

  return health;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const health = await runEventSharePilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("EVENT_SHARE_PILOT_TEAM_ID"),
    expectEnabled: process.env.EXPECT_EVENT_SHARE_CARD_ENABLED === "true",
  });

  console.log(
    JSON.stringify(
      {
        status: "Sonda operacional do cartão público concluída.",
        ...health,
      },
      null,
      2,
    ),
  );
}
