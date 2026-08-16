import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";

const script = join(dirname(fileURLToPath(import.meta.url)), "context-brief.mjs");
const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture({ release = "R10" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "deutime-context-"));
  roots.push(root);
  execFileSync("git", ["init", "-q", "-b", "test-branch"], { cwd: root });
  mkdirSync(join(root, "docs/work"), { recursive: true });
  mkdirSync(join(root, "docs/releases"), { recursive: true });

  writeFileSync(
    join(root, "docs/work/current.md"),
    `---\nrelease: ${release}\nwork_package: WP-R10-02\nbranch_or_commit: "test-branch"\ncheckpoint: CP1\nstatus: ready\nnext_action: "Implementar a visao privada."\n---\n`,
  );

  if (release !== "null") {
    writeFileSync(
      join(root, "docs/releases/R10-exemplo.md"),
      `---\nid: R10\nbaseline:\n  - BASE-IDENTITY\ndecisions:\n  - DEC-EXAMPLE\ninvariants:\n  - INV-RLS-MULTI-TIME\n---\n\n# R10 — Exemplo\n\n## Resultado demonstrável\n\nResultado.\n\n## Contratos e decisões\n\nContrato.\n\n## Entry points\n\n- app/exemplo.ts\n\n## Pacotes de trabalho\n\n| Pacote | Critérios |\n|---|---|\n| \`WP-R10-02\` | \`AC-R10-01\` |\n\n## Critérios de aceite\n\n- [ ] \`AC-R10-01\` — exemplo.\n\n## Riscos e controles\n\nRisco.\n\n## Validação\n\nTeste.\n\n## Rollout, fallback e rollback\n\nFlag.\n\n## Evidências e checkpoint\n`,
    );
  }

  return root;
}

function run(root, ...args) {
  return execFileSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
}

test("mantém o resumo padrão compacto e acionável", () => {
  const output = run(fixture());
  assert.match(output, /Release: R10; pacote: WP-R10-02; checkpoint: CP1/);
  assert.match(output, /Git: test-branch/);
  assert.match(output, /WP atual L\d+/);
  assert.match(output, /resultado L\d+; contratos L\d+; entrypoints L\d+/);
  assert.match(output, /criterios L\d+; riscos L\d+; validacao L\d+; rollout L\d+/);
  assert.match(output, /baseline 1; decisions 1; invariants 1/);
  assert.doesNotMatch(output, /DEC-EXAMPLE/);
  assert.doesNotMatch(output, /MAPA COMPLETO/);
  assert.ok(output.length < 1_400, `resumo excedeu 1400 caracteres: ${output.length}`);
});

test("revela IDs e mapa somente sob demanda", () => {
  const root = fixture();
  assert.match(run(root, "--ids"), /DEC-EXAMPLE/);
  assert.match(run(root, "--map"), /MAPA COMPLETO[\s\S]*## Evidências e checkpoint/);
});

test("aceita checkpoint sem release ativa", () => {
  const output = run(fixture({ release: "null" }));
  assert.match(output, /Release: nenhuma; estado: ready/);
  assert.doesNotMatch(output, /REFERENCIAS|JANELAS/);
});

test("rejeita opcao desconhecida", () => {
  const result = spawnSync(process.execPath, [script, "--verbose"], {
    cwd: fixture(),
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /opcao desconhecida/);
});
