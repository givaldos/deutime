const mode = process.env.SMOKE_MODE;
const appUrl = new URL(required("APP_URL"));

if (mode !== "production-readonly") {
  throw new Error("SMOKE_MODE deve ser production-readonly.");
}

await checkPublicJourney("/");
await checkPublicJourney("/auth/login");

console.log("Smoke de produção somente leitura concluído.");

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
