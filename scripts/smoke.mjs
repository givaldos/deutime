import { pathToFileURL } from "node:url";

const publicEventIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicChampionshipIdPattern = publicEventIdPattern;
const publicPlayerHandlePattern =
  /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export async function runProductionSmoke({
  mode,
  appUrl,
  publicEventId,
  expectEventShareCardEnabled = false,
  publicChampionshipId,
  expectChampionshipEnabled = false,
  publicPlayerHandle,
  expectRecognitionSummary = false,
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

  if (publicChampionshipId) {
    validatePublicChampionshipId(publicChampionshipId);
    await checkPublicChampionshipJourney(
      publicChampionshipId,
      canonicalAppUrl,
      expectChampionshipEnabled,
      fetchImpl,
    );
  }

  if (publicPlayerHandle) {
    validatePublicPlayerHandle(publicPlayerHandle);
    await checkPublicPlayerJourney(
      publicPlayerHandle,
      canonicalAppUrl,
      expectRecognitionSummary,
      fetchImpl,
    );
  }

  return {
    publicEventChecked: Boolean(publicEventId),
    publicChampionshipChecked: Boolean(publicChampionshipId),
    publicPlayerChecked: Boolean(publicPlayerHandle),
  };
}

export function validatePublicEventId(publicEventId) {
  if (!publicEventIdPattern.test(publicEventId)) {
    throw new Error("SMOKE_PUBLIC_EVENT_ID deve ser um UUID canônico.");
  }
}

export function validatePublicChampionshipId(publicChampionshipId) {
  if (!publicChampionshipIdPattern.test(publicChampionshipId)) {
    throw new Error("SMOKE_PUBLIC_CHAMPIONSHIP_ID deve ser um UUID canônico.");
  }
}

export function validatePublicPlayerHandle(handle) {
  if (!publicPlayerHandlePattern.test(handle)) {
    throw new Error(
      "SMOKE_PUBLIC_PLAYER_HANDLE deve ser um handle público canônico.",
    );
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

async function checkPublicChampionshipJourney(
  publicChampionshipId,
  appUrl,
  expectChampionshipEnabled,
  fetchImpl,
) {
  const pathname = `/c/${publicChampionshipId}`;
  const response = await fetchImpl(new URL(pathname, appUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  requireHeader(response, pathname, "cache-control", "no-store");
  requireHeader(response, pathname, "referrer-policy", "no-referrer");
  requireHeader(response, pathname, "x-robots-tag", "noindex");
  requireHeader(response, pathname, "x-robots-tag", "nofollow");
  requireHeader(response, pathname, "x-content-type-options", "nosniff");

  if (!expectChampionshipEnabled) {
    if (response.status !== 404) {
      throw new Error(
        `${pathname} deveria estar no fallback, mas respondeu HTTP ${response.status}.`,
      );
    }
    return;
  }

  if (!response.ok) {
    throw new Error(`${pathname} indisponível: HTTP ${response.status}.`);
  }
  requireHeader(response, pathname, "content-type", "text/html");
  const html = await response.text();
  const canonicalPattern = new RegExp(
    `<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*/c/${publicChampionshipId}["']`,
    "i",
  );
  if (!canonicalPattern.test(html)) {
    throw new Error(`${pathname} não preservou a URL canônica do campeonato.`);
  }
  if (
    /athlete_id|championship_id|participant_id|fixture_id|team_id|venue_address|capability=|token=|secret=/i.test(
      html,
    )
  ) {
    throw new Error(`${pathname} publicou dado privado ou identificador interno.`);
  }
  if (
    !html.includes("Regulamento publicado") ||
    !html.includes("Confrontos") ||
    !html.includes("Compartilhar campeonato")
  ) {
    throw new Error(`${pathname} não publicou os blocos mínimos do campeonato.`);
  }
}

async function checkPublicPlayerJourney(
  handle,
  appUrl,
  expectRecognitionSummary,
  fetchImpl,
) {
  const pathname = `/p/${handle}`;
  const response = await fetchImpl(new URL(pathname, appUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${pathname} indisponível: HTTP ${response.status}.`);
  }
  requireHeader(response, pathname, "content-type", "text/html");

  const html = await response.text();
  if (
    /athlete_id|user_id|team_id|source_id|match_id|event_id|catalog_version|capability=|token=|secret=/i.test(
      html,
    )
  ) {
    throw new Error(`${pathname} publicou dado privado ou identificador interno.`);
  }
  if (
    !html.includes("Perfil público") ||
    !html.includes("Estatísticas") ||
    !html.includes("Posições preferenciais")
  ) {
    throw new Error(`${pathname} não publicou os blocos mínimos do perfil.`);
  }

  const hasRecognitionSummary = html.includes("Conquistas reconhecidas");
  if (expectRecognitionSummary && !hasRecognitionSummary) {
    throw new Error(`${pathname} não publicou o resumo consentido esperado.`);
  }
  if (!expectRecognitionSummary && hasRecognitionSummary) {
    throw new Error(`${pathname} publicou resumo sem consentimento esperado.`);
  }
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
    publicChampionshipId: process.env.SMOKE_PUBLIC_CHAMPIONSHIP_ID?.trim(),
    expectChampionshipEnabled:
      process.env.EXPECT_CHAMPIONSHIP_ENABLED === "true",
    publicPlayerHandle: process.env.SMOKE_PUBLIC_PLAYER_HANDLE?.trim(),
    expectRecognitionSummary:
      process.env.EXPECT_RECOGNITION_SUMMARY === "true",
  });

  const checked = [
    result.publicEventChecked ? "evento público" : null,
    result.publicChampionshipChecked ? "campeonato público" : null,
    result.publicPlayerChecked ? "perfil público" : null,
  ].filter(Boolean);
  console.log(checked.length
    ? `Smoke de produção somente leitura concluído, incluindo ${checked.join(" e ")}.`
    : "Smoke de produção somente leitura concluído; jornadas opcionais não configuradas.");
}
