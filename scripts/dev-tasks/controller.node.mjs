import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { childEnvironment, git, invocation, loadPolicy, observe, prepare, safePath, scopeViolations, validateTask } from "./core.mjs";
import { enqueue, loadState, locked, recover, report, review, runProcess, runTask, storage, taskDirectory, writeJson } from "./runner.mjs";

const policy = loadPolicy(resolve(import.meta.dirname, "../.."));
const task = { id: "teste-contexto", objective: "Conferir as referências documentadas.", profile: "simples", mode: "read-only", risk: "normal",
  scope: ["docs/guide.md"], context: [{ path: "docs/guide.md", start: 1, end: 2 }], acceptance: ["Apresentar evidência."], validation: ["Comparar arquivo e linha."] };
const completed = { type: "turn.completed", usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 10 } };

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), "deutime-tasks-"));
  const root = join(base, "repo"), remote = join(base, "remote.git");
  mkdirSync(root); mkdirSync(join(root, "docs"));
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  git(root, "init", "-b", "dev");
  git(root, "config", "user.name", "Teste"); git(root, "config", "user.email", "teste@example.invalid");
  writeFileSync(join(root, "AGENTS.md"), "Preserve isolamento e valide alterações.\n");
  writeFileSync(join(root, "docs/guide.md"), "Primeira linha\nSegunda linha\nTerceira linha\n");
  writeFileSync(join(root, ".gitignore"), ".dev-tasks/\n");
  git(root, "add", "."); git(root, "-c", "commit.gpgsign=false", "commit", "-m", "fixture");
  git(root, "remote", "add", "origin", remote);
  git(root, "push", "origin", "dev:dev", "dev:main"); git(root, "fetch", "origin");
  t.after(() => rmSync(base, { recursive: true, force: true }));
  return { root, base, store: storage(root) };
}

function fakeCodex(t, base, body = `console.log(${JSON.stringify(JSON.stringify(completed))})`) {
  const bin = join(base, "bin"); mkdirSync(bin, { recursive: true });
  const path = join(bin, "codex");
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`); chmodSync(path, 0o700);
  const previous = process.env.PATH;
  process.env.PATH = `${bin}:${previous}`;
  t.after(() => { process.env.PATH = previous; });
  return path;
}

test("contexto usa o commit, recusa links, segredos e faixas inválidas", (t) => {
  const { root } = fixture(t);
  writeFileSync(join(root, "docs/guide.md"), "Conteúdo local não aprovado\n");
  const context = prepare(root, task, policy);
  assert.match(context.prompt, /Primeira linha/);
  assert.doesNotMatch(context.prompt, /Conteúdo local/);
  assert.throws(() => prepare(root, task, { ...policy, maxContextBytes: 10 }), /excede/);
  assert.throws(() => prepare(root, { ...task, context: [{ path: "docs/guide.md", start: 1, end: 20 }] }, policy), /Faixa excede/);
  for (const path of ["../secret", "/tmp/a", ".env", "docs/.env.local", ".git/config", "secrets.pem", ".npmrc", ".netrc", "node_modules/a", "docs/a;id", "docs//a"])
    assert.throws(() => safePath(path));
  symlinkSync("guide.md", join(root, "docs/link.md"));
  git(root, "add", "docs/link.md"); git(root, "-c", "commit.gpgsign=false", "commit", "-m", "link");
  assert.throws(() => prepare(root, { ...task, context: [{ path: "docs/link.md", start: 1, end: 1 }] }, policy), /regular/);
});

test("encaminhamento recusa risco sensível em perfil econômico e campos desconhecidos", () => {
  for (const scope of [["supabase/migrations/new.sql"], ["app/actions/events.ts"], [".github/workflows/ci.yml"], ["package.json"]])
    assert.throws(() => validateTask({ ...task, scope }, policy), /critico/);
  assert.throws(() => validateTask({ ...task, risk: "critical" }, policy), /critico/);
  assert.throws(() => validateTask({ ...task, command: "arbitrary command" }, policy), /desconhecido/);
  assert.equal(validateTask({ ...task, risk: "critical", profile: "critico" }, policy).profile, "critico");
  assert.deepEqual(scopeViolations({ ...task, mode: "write" }, ["docs/guide.md", "docs/guide.md-evil", "supabase/a.sql"]), ["docs/guide.md-evil", "supabase/a.sql"]);
});

test("adaptadores preservam sandbox, argumentos e ambiente sem chaves da aplicação", () => {
  const codex = invocation(policy.profiles.padrao, { ...task, mode: "write" }, "/tmp/a b", "/tmp/prompt");
  assert.ok(codex.args.includes("workspace-write"));
  assert.ok(codex.args.includes('approval_policy="never"'));
  assert.ok(codex.args.includes("--ignore-user-config"));
  assert.ok(codex.args.includes("/tmp/a b"));
  const muse = invocation(policy.profiles.muse, task, "/tmp/a", "/tmp/prompt");
  assert.ok(muse.args.includes("--disable-shell"));
  assert.ok(muse.args.includes("--max-model-steps"));
  for (const call of [codex, muse]) assert.ok(!call.args.some((arg) => /yolo|bypass|disable-sandbox|disable-approval/.test(arg)));
  assert.deepEqual(childEnvironment({ PATH: "/bin", HOME: "/home/test", OPENAI_API_KEY: "secret", AWS_SECRET_ACCESS_KEY: "secret", SUPABASE_SERVICE_ROLE_KEY: "secret", NODE_OPTIONS: "--import=evil" }), { PATH: "/bin", HOME: "/home/test" });
});

test("consumo não soma cache novamente nem infere zero de eventos ausentes", () => {
  const metrics = { usage: null, missingUsage: false };
  observe(completed, "codex", metrics); observe(completed, "codex", metrics);
  assert.deepEqual(metrics.usage, { input: 200, output: 20, cachedInput: 160 });
  observe({ type: "turn.completed" }, "codex", metrics);
  assert.equal(metrics.missingUsage, true);
  const muse = { usage: null };
  observe({ payload_type: "run.terminal.completed", payload: { terminal: "completed", text: "OK" } }, "muse", muse);
  assert.equal(muse.completed, true); assert.equal(muse.usage, null);
});

test("fila é idempotente e lock impede concorrência", async (t) => {
  const { root, store } = fixture(t);
  enqueue(root, store, task, policy);
  assert.equal(enqueue(root, store, task, policy).attempts.length, 0);
  assert.throws(() => enqueue(root, store, { ...task, objective: "Outro objetivo definido." }, policy), /outro contrato/);
  await locked(store, async () => {
    await assert.rejects(locked(store, () => null), /ativa/);
    assert.throws(() => recover(store), /ainda ativo/);
  });
  assert.equal(existsSync(join(store, "active.lock")), false);
});

test("processo falho, saída inválida e timeout nunca contam como sucesso", async (t) => {
  const { root, store } = fixture(t);
  const options = { workspace: root, stopFile: join(store, "STOP"), executor: "codex", timeoutMs: 1000 };
  const failed = await runProcess(process.execPath, ["-e", "process.exit(1)"], options);
  assert.equal(failed.status, "failed"); assert.equal(failed.usage, null);
  const invalid = await runProcess(process.execPath, ["-e", 'console.log("not json")'], options);
  assert.equal(invalid.status, "invalid-output");
  const timeout = await runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { ...options, timeoutMs: 100 });
  assert.equal(timeout.status, "timeout");
  const unavailable = await runProcess("/nonexistent-deutime-executor", [], options);
  assert.equal(unavailable.status, "executor-unavailable");
});

test("STOP interrompe processo ativo e bloqueia nova tentativa", async (t) => {
  const { root, store } = fixture(t);
  const stopFile = join(store, "STOP");
  const result = await runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    workspace: root, executor: "codex", timeoutMs: 3000, stopFile, onSpawn: () => writeFileSync(stopFile, "STOP"),
  });
  assert.equal(result.status, "stopped");
  enqueue(root, store, task, policy);
  await assert.rejects(runTask(root, store, task.id, policy), /suspensa/);
  assert.equal(loadState(store, task.id).attempts.length, 0);
});

test("execução cria worktree de dev, aguarda revisão e contabiliza aceite separado", async (t) => {
  const { root, base, store } = fixture(t); fakeCodex(t, base);
  enqueue(root, store, task, policy);
  const state = await runTask(root, store, task.id, policy);
  assert.equal(state.status, "awaiting-review");
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(git(state.workspace, "branch", "--show-current"), `codex/task-${task.id}`);
  assert.deepEqual(state.attempts[0].usage, { input: 100, output: 10, cachedInput: 80 });
  await assert.rejects(runTask(root, store, task.id, policy), /não permite/);
  assert.throws(() => review(store, task.id, { result: "accepted", evidence: "", corrections: 0 }), /válidos/);
  const accepted = review(store, task.id, { result: "accepted", evidence: "Referências verificadas manualmente no diff.", corrections: 0 });
  const [row] = report([accepted]);
  assert.equal(row.status, "accepted"); assert.equal(row.reportedTokens, 110); assert.equal(row.quotaPercent, null);
});

test("falhas preservam worktree, limitam tentativas e mantêm consumo desconhecido", async (t) => {
  const { root, base, store } = fixture(t); fakeCodex(t, base, "process.exit(1)");
  enqueue(root, store, task, policy);
  const first = await runTask(root, store, task.id, policy);
  const second = await runTask(root, store, task.id, policy);
  assert.equal(first.workspace, second.workspace); assert.equal(second.attempts.length, 2);
  assert.equal(second.status, "needs-attention");
  assert.equal(report([second])[0].reportedTokens, null);
  await assert.rejects(runTask(root, store, task.id, policy), /Limite de tentativas/);
  assert.ok(existsSync(join(second.workspace, "docs/guide.md")));
});

test("mudança fora do escopo não é aceita mesmo com saída de sucesso", async (t) => {
  const { root, base, store } = fixture(t);
  fakeCodex(t, base, `require('node:fs').writeFileSync('escape.txt','alterado');console.log(${JSON.stringify(JSON.stringify(completed))})`);
  enqueue(root, store, task, policy);
  const state = await runTask(root, store, task.id, policy);
  assert.equal(state.status, "needs-attention");
  assert.deepEqual(state.attempts[0].violations, ["escape.txt"]);
  assert.throws(() => review(store, task.id, { result: "accepted", evidence: "Tentativa de aceite sem validação", corrections: 0 }), /não está aguardando/);
});

test("não executa sobre dev desatualizada ou main não reconciliada", async (t) => {
  const { root, store } = fixture(t); enqueue(root, store, task, policy);
  writeFileSync(join(root, "extra.md"), "extra"); git(root, "add", ".");
  git(root, "-c", "commit.gpgsign=false", "commit", "-m", "extra");
  await assert.rejects(runTask(root, store, task.id, policy), /fast-forward/);
  git(root, "push", "origin", "dev:main");
  git(root, "reset", "--hard", "origin/dev");
  await assert.rejects(runTask(root, store, task.id, policy));
  assert.equal(loadState(store, task.id).attempts.length, 0);
});

test("recover preserva evidências e marca execução incompleta", (t) => {
  const { root, store } = fixture(t); const state = enqueue(root, store, task, policy);
  state.status = "running"; state.attempts.push({ status: "running", pid: null });
  const file = join(taskDirectory(store, task.id), "state.json"); writeJson(file, state);
  assert.equal(recover(store), 1);
  const recovered = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(recovered.status, "needs-attention"); assert.equal(recovered.attempts[0].usage, null);
  assert.equal(report([recovered])[0].durationMs, null);
});

test("rejeição alimenta a retomada sem carregar histórico completo", async (t) => {
  const { root, base, store } = fixture(t); fakeCodex(t, base);
  enqueue(root, store, task, policy);
  await runTask(root, store, task.id, policy);
  review(store, task.id, { result: "rejected", evidence: "Corrigir o achado sem evidência na segunda linha.", corrections: 1 });
  const state = await runTask(root, store, task.id, policy);
  const prompt = readFileSync(join(taskDirectory(store, task.id), "attempt-2/prompt.txt"), "utf8");
  assert.match(prompt, /Corrigir o achado sem evidência/);
  assert.equal(state.status, "awaiting-review");
  assert.equal(state.attempts.length, 2);
  assert.equal(report([state])[0].corrections, 1);
});
