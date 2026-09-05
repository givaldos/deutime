import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(random = randomBytes) {
  const bytes = random(16);
  const characters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return characters.join("").match(/.{4}/g).join("-");
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

async function rpc(functionName, body) {
  const baseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = required("SUPABASE_SECRET_KEY");
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Operação de convite indisponível: HTTP ${response.status}.`);
  }
  return response.json();
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === "status") {
    const status = await rpc("get_prelaunch_team_invite_status", {});
    console.log(JSON.stringify({ status: status[0] ?? status }, null, 2));
    return;
  }

  if (command === "enable" || command === "disable") {
    await rpc("set_runtime_control", {
      requested_control: "team_creation_invite_only",
      requested_enabled: command === "enable",
    });
    console.log(
      JSON.stringify({ inviteOnly: command === "enable" }, null, 2),
    );
    return;
  }

  if (command === "revoke") {
    const [inviteId] = args;
    if (!/^[0-9a-f-]{36}$/i.test(inviteId ?? "")) {
      throw new Error("Informe o UUID do convite a revogar.");
    }
    const revoked = await rpc("revoke_prelaunch_team_invite", {
      requested_invite_id: inviteId,
    });
    console.log(JSON.stringify({ revoked }, null, 2));
    return;
  }

  if (command === "issue") {
    const [label, validityDaysRaw = "14", maxRedemptionsRaw = "1"] = args;
    const validityDays = Number(validityDaysRaw);
    const maxRedemptions = Number(maxRedemptionsRaw);
    if (!label || label.trim().length < 2 || label.trim().length > 80) {
      throw new Error("Informe um rótulo entre 2 e 80 caracteres.");
    }
    if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 90) {
      throw new Error("A validade deve estar entre 1 e 90 dias.");
    }
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1000) {
      throw new Error("O limite de usos deve estar entre 1 e 1000.");
    }

    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + validityDays * 86_400_000).toISOString();
    const inviteId = await rpc("issue_prelaunch_team_invite", {
      requested_code: code,
      requested_label: label.trim(),
      requested_max_redemptions: maxRedemptions,
      requested_expires_at: expiresAt,
    });
    console.log(JSON.stringify({ inviteId, code, expiresAt, maxRedemptions }, null, 2));
    return;
  }

  throw new Error(
    "Uso: prelaunch:invite status|enable|disable|issue <rótulo> [dias] [usos]|revoke <uuid>",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
