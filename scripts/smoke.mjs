import { pathToFileURL } from "node:url";

const publicEventIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function runProductionSmoke({
  mode,
  appUrl,
  publicEventId,
  fetchImpl = fetch,
}) {
  if (mode !== "production-readonly") {
    throw new Error("SMOKE_MODE deve ser production-readonly.");
  }

  const canonicalAppUrl = new URL(appUrl);

  await checkPublicJourney("/", canonicalAppUrl, fetchImpl);
  await checkPublicJourney("/auth/login", canonicalAppUrl, fetchImpl);

  if (publicEventId) {
    validatePublicEventId(publicEventId);
    await checkPublicEventJourney(
      publicEventId,
      canonicalAppUrl,
      fetchImpl,
    );
  }

  return { publicEventChecked: Boolean(publicEventId) };
}

export function validatePublicEventId(publicEventId) {
  if (!publicEventIdPattern.test(publicEventId)) {
    throw new Error("SMOKE_PUBLIC_EVENT_ID deve ser um UUID canônico.");
  }
}

async function checkPublicJourney(pathname, appUrl, fetchImpl) {
  const response = await fetchImpl(new URL(pathname, appUrl), {
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

async function checkPublicEventJourney(publicEventId, appUrl, fetchImpl) {
  const pathname = `/e/${publicEventId}`;
  const response = await fetchImpl(new URL(pathname, appUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${pathname} indisponível: HTTP ${response.status}.`);
  }

  requireHeader(response, pathname, "content-type", "text/html");
  requireHeader(response, pathname, "cache-control", "no-store");
  requireHeader(response, pathname, "referrer-policy", "no-referrer");
  requireHeader(response, pathname, "x-robots-tag", "noindex");

  const exchangePath = `${pathname}/access`;
  const exchangeResponse = await fetchImpl(new URL(exchangePath, appUrl), {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });

  if (exchangeResponse.status !== 405) {
    throw new Error(
      `${exchangePath} aceitou método de leitura inesperadamente: HTTP ${exchangeResponse.status}.`,
    );
  }

  requireHeader(
    exchangeResponse,
    exchangePath,
    "referrer-policy",
    "no-referrer",
  );
  requireHeader(
    exchangeResponse,
    exchangePath,
    "x-content-type-options",
    "nosniff",
  );
}

function requireHeader(response, pathname, name, expectedValue) {
  const value = response.headers.get(name) ?? "";
  if (!value.toLowerCase().includes(expectedValue.toLowerCase())) {
    throw new Error(
      `${pathname} não retornou ${name} contendo ${expectedValue}.`,
    );
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = await runProductionSmoke({
    mode: process.env.SMOKE_MODE,
    appUrl: required("APP_URL"),
    publicEventId: process.env.SMOKE_PUBLIC_EVENT_ID?.trim(),
  });

  console.log(
    result.publicEventChecked
      ? "Smoke de produção somente leitura concluído, incluindo evento público."
      : "Smoke de produção somente leitura concluído; evento público não configurado.",
  );
}
