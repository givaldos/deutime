import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const migrationNamePattern =
  /^supabase\/migrations\/\d{12}_[a-z0-9_]+\.sql$/;

export function findMigrationIntegrityErrors(diffOutput) {
  const errors = [];

  for (const line of diffOutput.split("\n").filter(Boolean)) {
    const [status, firstPath, secondPath] = line.split("\t");
    const paths = [firstPath, secondPath].filter(Boolean);

    if (status !== "A") {
      errors.push(
        `Migration aplicada é imutável: ${status} ${paths.join(" -> ")}`,
      );
      continue;
    }

    if (!migrationNamePattern.test(firstPath)) {
      errors.push(`Nome de migration inválido: ${firstPath}`);
    }
  }

  return errors;
}

export function checkMigrationIntegrity(base, head = "HEAD") {
  const result = spawnSync(
    "git",
    [
      "diff",
      "--name-status",
      "--find-renames",
      base,
      head,
      "--",
      "supabase/migrations",
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Não foi possível comparar migrations.");
  }

  return findMigrationIntegrityErrors(result.stdout);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const base = process.argv[2];
  const head = process.argv[3] ?? "HEAD";

  if (!base) {
    console.error("Uso: node scripts/check-migration-integrity.mjs <base> [head]");
    process.exit(2);
  }

  const errors = checkMigrationIntegrity(base, head);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }

  console.log("Histórico de migrations preservado; somente expansões novas foram adicionadas.");
}

