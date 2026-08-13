import { pathToFileURL } from "node:url";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const booleanFields = [
  "championships_enabled",
  "public_event_page_enabled",
];

const countFields = [
  "championships_total",
  "draft_championships",
  "published_championships",
  "active_championships",
  "completed_championships",
  "archived_championships",
  "league_championships",
  "groups_knockout_championships",
  "knockout_championships",
  "page_candidates",
  "projected_championships",
  "fallback_championships",
  "participants_total",
  "fixtures_total",
  "linked_fixtures",
  "finalized_fixtures",
  "void_fixtures",
  "resolved_fixtures",
  "projected_participants",
  "projected_fixtures",
  "projected_standings",
  "reconstruction_mismatches",
  "commands_24h",
];

export async function runChampionshipPilotHealth({
  supabaseUrl,
  secretKey,
  teamId,
  expectEnabled = false,
  expectProjection = false,
  fetchImpl = fetch,
}) {
  if (!uuidPattern.test(teamId)) {
    throw new Error("CHAMPIONSHIP_PILOT_TEAM_ID deve ser um UUID canônico.");
  }

  const endpoint = new URL(
    "/rest/v1/rpc/get_championship_pilot_health",
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
      `Sonda operacional de campeonatos indisponível: HTTP ${response.status}.`,
    );
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Sonda operacional de campeonatos não encontrou a coorte.");
  }

  const health = normalizeHealth(rows[0]);
  if (expectEnabled) {
    if (!health.championships_enabled) {
      throw new Error(
        "Piloto de campeonatos deveria estar ativo, mas a flag está desligada.",
      );
    }
  } else if (health.championships_enabled) {
    throw new Error(
      "Piloto de campeonatos deveria estar desligado, mas a flag está ativa.",
    );
  }

  if (expectProjection) {
    if (!expectEnabled) {
      throw new Error(
        "A projeção do piloto só pode ser exigida com a capacidade ativa.",
      );
    }
    if (
      health.page_candidates < 1 ||
      health.projected_championships !== health.page_candidates ||
      health.participants_total < 2 ||
      health.fixtures_total < 1
    ) {
      throw new Error(
        "Piloto ativo não possui uma projeção pública completa para observação.",
      );
    }
  }

  if (
    health.reconstruction_mismatches > 0 ||
    (expectEnabled && health.fallback_championships > 0) ||
    (!expectEnabled && health.projected_championships > 0)
  ) {
    throw new Error(
      "Sonda operacional de campeonatos detectou projeção ou reconstrução divergente.",
    );
  }

  return health;
}

function normalizeHealth(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Sonda operacional de campeonatos retornou contrato inválido.");
  }

  for (const field of booleanFields) {
    if (typeof value[field] !== "boolean") {
      throw new Error("Sonda operacional de campeonatos retornou contrato inválido.");
    }
  }

  const health = { ...value };
  for (const field of countFields) {
    const count = Number(value[field]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Sonda operacional de campeonatos retornou contrato inválido.");
    }
    health[field] = count;
  }

  const statusTotal = [
    "draft_championships",
    "published_championships",
    "active_championships",
    "completed_championships",
    "archived_championships",
  ].reduce((total, field) => total + health[field], 0);
  const formatTotal = [
    "league_championships",
    "groups_knockout_championships",
    "knockout_championships",
  ].reduce((total, field) => total + health[field], 0);

  if (
    statusTotal !== health.championships_total ||
    formatTotal !== health.championships_total ||
    health.projected_championships + health.fallback_championships !==
      health.page_candidates ||
    health.linked_fixtures > health.fixtures_total ||
    health.finalized_fixtures + health.void_fixtures > health.fixtures_total ||
    health.resolved_fixtures > health.fixtures_total
  ) {
    throw new Error("Sonda operacional de campeonatos retornou contrato inválido.");
  }

  return health;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const health = await runChampionshipPilotHealth({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    teamId: required("CHAMPIONSHIP_PILOT_TEAM_ID"),
    expectEnabled: process.env.EXPECT_CHAMPIONSHIP_ENABLED === "true",
    expectProjection: process.env.EXPECT_CHAMPIONSHIP_PROJECTION === "true",
  });

  console.log(
    JSON.stringify(
      {
        status: "Sonda operacional de campeonatos concluída.",
        ...health,
      },
      null,
      2,
    ),
  );
}
