/**
 * Prepara o ambiente de desenvolvimento completo:
 *
 *   1. Cria o usuário admin no Supabase Auth via Admin API (UUID fixo)
 *   2. Roda `supabase db reset` — aplica migrations + seed.sql
 *
 * O usuário precisa existir ANTES do seed.sql rodar porque o seed
 * referencia o UUID como created_by / approved_by nos times e atletas.
 *
 * Execute:
 *   npm run db:seed-user
 *
 * Ou manualmente:
 *   node scripts/create-seed-user.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Lê .env.local sem depender de dotenv
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SECRET_KEY;
const SEED_USER_ID      = "00000000-0000-0000-0000-000000000001";
const SEED_EMAIL        = "admin@deutime.dev";
const SEED_PASSWORD     = "Dev@2026!";

if (!SERVICE_ROLE_KEY) {
  console.error("❌  SUPABASE_SECRET_KEY não encontrada em .env.local");
  console.error("    Copie o valor 'Secret' de: npx supabase status");
  process.exit(1);
}

const BASE    = `${SUPABASE_URL}/auth/v1`;
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
};

async function adminFetch(method, path, body) {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: HEADERS,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      return { status: res.status, ok: res.ok, body: json };
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
  }
}

async function ensureUser() {
  // Verifica se já existe
  const get = await adminFetch("GET", `/admin/users/${SEED_USER_ID}`);
  if (get.ok && get.body?.id) {
    console.log("👤  Usuário já existe — atualizando senha…");
    const upd = await adminFetch("PUT", `/admin/users/${SEED_USER_ID}`, {
      password: SEED_PASSWORD,
      email_confirm: true,
    });
    if (!upd.ok) {
      console.error("❌  Falha ao atualizar:", JSON.stringify(upd.body));
      process.exit(1);
    }
    console.log("✅  Senha atualizada.");
    return;
  }

  // Cria com UUID fixo
  console.log("👤  Criando usuário admin…");
  const create = await adminFetch("POST", "/admin/users", {
    id:            SEED_USER_ID,
    email:         SEED_EMAIL,
    password:      SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Admin Seed" },
  });

  if (!create.ok) {
    console.error(`❌  Falha ao criar usuário (HTTP ${create.status}):`);
    console.error("   ", JSON.stringify(create.body, null, 2));
    process.exit(1);
  }
  console.log(`✅  Usuário criado: ${create.body.email} (${create.body.id})`);
}

async function run() {
  console.log(`🔑  Supabase: ${SUPABASE_URL}`);

  // Passo 1: garante o usuário no Auth
  await ensureUser();

  // Passo 2: roda db:reset para aplicar migrations + seed.sql
  // O seed.sql referencia o UUID que acabou de ser criado, então a ordem importa.
  console.log("");
  console.log("🗄️   Rodando supabase db reset (migrations + seed)…");
  try {
    execSync("npx supabase db reset", { stdio: "inherit" });
  } catch {
    console.error("❌  supabase db reset falhou.");
    process.exit(1);
  }

  // Passo 3: o db:reset recria auth.users do zero — usuário sumiu, recriar
  console.log("");
  console.log("🔄  Recriando usuário após reset…");
  await ensureUser();

  console.log("");
  console.log("🎉  Ambiente pronto!");
  console.log(`    Email : ${SEED_EMAIL}`);
  console.log(`    Senha : ${SEED_PASSWORD}`);
  console.log(`    Studio: http://127.0.0.1:54323`);
}

run();
