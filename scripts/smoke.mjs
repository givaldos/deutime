const mode = process.env.SMOKE_MODE;
const appUrl = new URL(required("APP_URL"));

if (mode !== "production-readonly" && mode !== "staging-write") {
  throw new Error("SMOKE_MODE deve ser production-readonly ou staging-write.");
}

await checkPublicJourney("/");
await checkPublicJourney("/auth/login");

if (mode === "staging-write") {
  const supabaseUrl = new URL(required("SUPABASE_URL"));
  const secretKey = required("SUPABASE_SECRET_KEY");
  const productionSupabaseUrl = new URL(required("PRODUCTION_SUPABASE_URL"));
  const productionSecretKey = required("PRODUCTION_SUPABASE_SECRET_KEY");
  const syntheticTeamId = required("SMOKE_SYNTHETIC_TEAM_ID");

  if (supabaseUrl.origin === productionSupabaseUrl.origin) {
    throw new Error("Staging não pode apontar para o projeto Supabase de produção.");
  }
  if (secretKey === productionSecretKey) {
    throw new Error("Staging não pode reutilizar a chave de produção.");
  }
  if (appUrl.origin === new URL(required("PRODUCTION_APP_URL")).origin) {
    throw new Error("Staging deve usar callback/origem separado de produção.");
  }

  const idempotencyKey = `smoke-r00-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  const response = await fetch(
    new URL("/rest/v1/rpc/run_staging_delivery_smoke", supabaseUrl),
    {
      method: "POST",
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requested_team_id: syntheticTeamId,
        requested_idempotency_key: idempotencyKey,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Smoke sintético falhou com HTTP ${response.status}.`);
  }
}

console.log(
  mode === "production-readonly"
    ? "Smoke de produção somente leitura concluído."
    : "Smoke de staging sintético e idempotente concluído.",
);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

async function checkPublicJourney(pathname) {
  const response = await fetch(new URL(pathname, appUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${pathname} indisponível: HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${pathname} não retornou HTML.`);
  }
}

