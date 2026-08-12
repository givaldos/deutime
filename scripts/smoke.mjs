import { pathToFileURL } from "node:url";

const publicEventIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function runProductionSmoke({
  mode,
  appUrl,
  publicEventId,
  expectEventShareCardEnabled = false,
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
      expectEventShareCardEnabled,
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

async function checkPublicEventJourney(
  publicEventId,
  appUrl,
  expectEventShareCardEnabled,
  fetchImpl,
) {
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

  const html = await response.text();
  const canonicalPattern = new RegExp(
    `<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*/e/${publicEventId}["']`,
    "i",
  );
  if (!canonicalPattern.test(html)) {
    throw new Error(`${pathname} não preservou a URL canônica do evento.`);
  }
  if (/capability=|token=|secret=/i.test(html)) {
    throw new Error(`${pathname} publicou segredo em HTML ou metadata.`);
  }
  if (
    expectEventShareCardEnabled &&
    !new RegExp(`/e/${publicEventId}/convite\\.png\\?v=[0-9a-f]{12}`, "i").test(
      html,
    )
  ) {
    throw new Error(
      `${pathname} não publicou a versão opaca esperada do cartão evolutivo.`,
    );
  }

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

  const imagePath = `${pathname}/convite.png`;
  const imageResponse = await fetchImpl(new URL(imagePath, appUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!imageResponse.ok) {
    throw new Error(`${imagePath} indisponível: HTTP ${imageResponse.status}.`);
  }
  requirePublicEventImageHeaders(imageResponse, imagePath, {
    allowPrivateNoStore: !expectEventShareCardEnabled,
  });
  if ((await imageResponse.arrayBuffer()).byteLength < 8) {
    throw new Error(`${imagePath} retornou imagem vazia.`);
  }

  const imageHeadResponse = await fetchImpl(new URL(imagePath, appUrl), {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!imageHeadResponse.ok) {
    throw new Error(
      `${imagePath} não respondeu HEAD: HTTP ${imageHeadResponse.status}.`,
    );
  }
  requirePublicEventImageHeaders(imageHeadResponse, imagePath);
}

function requirePublicEventImageHeaders(
  response,
  pathname,
  { allowPrivateNoStore = false } = {},
) {
  requireHeader(response, pathname, "content-type", "image/png");
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  const hasPublicCache = cacheControl.includes("public");
  const hasPrivateNoStore =
    cacheControl.includes("private") && cacheControl.includes("no-store");
  if (!hasPublicCache && !(allowPrivateNoStore && hasPrivateNoStore)) {
    throw new Error(
      `${pathname} não retornou cache-control seguro para a fase observada.`,
    );
  }
  requireHeader(response, pathname, "referrer-policy", "no-referrer");
  requireHeader(response, pathname, "x-robots-tag", "noindex");
  requireHeader(response, pathname, "x-robots-tag", "nofollow");
  requireHeader(response, pathname, "x-robots-tag", "noimageindex");
  requireHeader(response, pathname, "x-content-type-options", "nosniff");
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
    expectEventShareCardEnabled:
      process.env.EXPECT_EVENT_SHARE_CARD_ENABLED === "true",
  });

  console.log(
    result.publicEventChecked
      ? "Smoke de produção somente leitura concluído, incluindo evento público."
      : "Smoke de produção somente leitura concluído; evento público não configurado.",
  );
}
