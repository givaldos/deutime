import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

export const REQUIRED_EMAIL_BRAND_FRAGMENTS = [
  "/brand/logo-deutime-email-640-fundo-escuro.png",
  "#0D2B22",
  "#BDF63C",
  "#F7FAF5",
  "Deu time, deu jogo.",
];

export const AUTH_EMAIL_TEMPLATES = [
  {
    contentField: "mailer_templates_confirmation_content",
    path: "supabase/templates/confirmation.html",
    requiredFragments: ["{{ .TokenHash }}", "/auth/confirm?token_hash="],
    subject: "Confirme seu e-mail — DeuTime",
    subjectField: "mailer_subjects_confirmation",
  },
  {
    contentField: "mailer_templates_recovery_content",
    path: "supabase/templates/recovery.html",
    requiredFragments: [
      "{{ .TokenHash }}",
      "/auth/recovery?token_hash=",
      "type=recovery",
    ],
    subject: "Redefina sua senha — DeuTime",
    subjectField: "mailer_subjects_recovery",
  },
  {
    contentField: "mailer_templates_password_changed_notification_content",
    path: "supabase/templates/password-changed.html",
    requiredFragments: ["/auth/forgot-password"],
    subject: "Sua senha foi alterada — DeuTime",
    subjectField: "mailer_subjects_password_changed_notification",
  },
];

export async function buildAuthEmailConfig(root = PROJECT_ROOT) {
  const config = {
    mailer_notifications_password_changed_enabled: true,
  };

  for (const template of AUTH_EMAIL_TEMPLATES) {
    const content = await readFile(new URL(template.path, `file://${root}/`), "utf8");

    for (const fragment of [
      ...REQUIRED_EMAIL_BRAND_FRAGMENTS,
      ...template.requiredFragments,
    ]) {
      if (!content.includes(fragment)) {
        throw new Error(`${template.path} não contém o contrato obrigatório: ${fragment}`);
      }
    }

    config[template.subjectField] = template.subject;
    config[template.contentField] = content;
  }

  return config;
}

export function changedAuthEmailConfig(current, desired) {
  return Object.fromEntries(
    Object.entries(desired).filter(([field, value]) => current[field] !== value),
  );
}

async function readResponse(response) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Supabase Management API respondeu ${response.status}: ${body.slice(0, 500)}`,
    );
  }

  return body ? JSON.parse(body) : {};
}

async function deploy() {
  const desired = await buildAuthEmailConfig();

  if (process.argv.includes("--check")) {
    console.log("Templates de autenticação válidos.");
    return;
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectId = process.env.SUPABASE_PROJECT_ID;
  if (!accessToken || !projectId) {
    throw new Error("SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_ID são obrigatórios.");
  }

  const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(projectId)}/config/auth`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const current = await readResponse(await fetch(endpoint, { headers }));
  const changes = changedAuthEmailConfig(current, desired);

  if (Object.keys(changes).length === 0) {
    console.log("Templates de autenticação já estão atualizados.");
    return;
  }

  await readResponse(
    await fetch(endpoint, {
      method: "PATCH",
      headers,
      body: JSON.stringify(changes),
    }),
  );

  const verified = await readResponse(await fetch(endpoint, { headers }));
  const remaining = changedAuthEmailConfig(verified, desired);
  if (Object.keys(remaining).length > 0) {
    throw new Error(
      `A configuração não foi confirmada após a atualização: ${Object.keys(remaining).join(", ")}`,
    );
  }

  console.log(
    `Templates de autenticação atualizados e verificados (${Object.keys(changes).length} campos).`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  deploy().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
