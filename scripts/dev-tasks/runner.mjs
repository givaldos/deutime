import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { childEnvironment, digest, git, invocation, observe, prepare, scopeViolations } from "./core.mjs";

export function storage(root) {
  const common = git(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  const dir = join(common, "dev-tasks");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function writeJson(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, path);
}

export async function locked(store, action) {
  const lock = join(store, "active.lock");
  let fd;
  try { fd = openSync(lock, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("Já existe operação ativa. Use status; após interrupção do processo, use recover.");
    throw error;
  }
  writeFileSync(fd, JSON.stringify({ pid: process.pid }));
  closeSync(fd);
  try { return await action(); }
  finally { unlinkSync(lock); }
}

export function taskDirectory(store, id) {
  if (!/^[a-z][a-z0-9-]{2,39}$/.test(id ?? "")) throw new Error("ID inválido.");
  return join(store, id);
}

export function loadState(store, id) {
  return JSON.parse(readFileSync(join(taskDirectory(store, id), "state.json"), "utf8"));
}

export function listStates(store) {
  return readdirSync(store, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(store, entry.name, "state.json")))
    .map((entry) => loadState(store, entry.name));
}

export function enqueue(root, store, task, policy) {
  const context = prepare(root, task, policy);
  const dir = taskDirectory(store, task.id);
  if (existsSync(dir)) {
    const state = loadState(store, task.id);
    if (state.taskDigest !== context.digest) throw new Error("ID já existe com outro contrato. Use um novo ID.");
    return state;
  }
  mkdirSync(dir, { mode: 0o700 });
  const state = { id: task.id, taskDigest: context.digest, task, status: "queued", attempts: [], review: null };
  writeJson(join(dir, "state.json"), state);
  return state;
}

function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
}

export function recover(store) {
  const lock = join(store, "active.lock");
  if (existsSync(lock)) {
    const owner = JSON.parse(readFileSync(lock, "utf8"));
    if (alive(owner.pid)) throw new Error("Processo controlador ainda ativo; use stop.");
  }
  const running = listStates(store).filter((state) => state.status === "running");
  if (running.some((state) => alive(state.attempts.at(-1)?.pid))) throw new Error("Executor ainda ativo. Confirme o encerramento antes de recover.");
  for (const state of running) {
    state.status = "needs-attention";
    Object.assign(state.attempts.at(-1), { status: "interrupted", finishedAt: new Date().toISOString(), usage: null, usageStatus: "unavailable" });
    writeJson(join(taskDirectory(store, state.id), "state.json"), state);
  }
  if (existsSync(lock)) unlinkSync(lock);
  return running.length;
}

export function runProcess(command, args, options) {
  return new Promise((resolveResult) => {
    const started = Date.now();
    const metrics = { completed: false, failed: false, usage: null, missingUsage: false, result: "" };
    let buffer = "", received = 0, reason = null, escalation;
    const child = spawn(command, args, { cwd: options.workspace, env: childEnvironment(), detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"] });
    const terminate = (signal) => {
      try { process.kill(process.platform === "win32" ? child.pid : -child.pid, signal); }
      catch { /* Process may have exited before its close event. */ }
    };
    const stop = (why) => {
      if (reason) return;
      reason = why;
      terminate("SIGTERM");
      escalation = setTimeout(() => terminate("SIGKILL"), 1500);
    };
    const onSignal = () => stop("interrupted");
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    const timer = setTimeout(() => stop("timeout"), options.timeoutMs);
    const watcher = setInterval(() => { if (existsSync(options.stopFile)) stop("stopped"); }, 250);
    const consume = (line) => {
      if (!line.trim()) return;
      try { observe(JSON.parse(line), options.executor, metrics); }
      catch { stop("invalid-output"); }
    };
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (data) => {
      received += Buffer.byteLength(data);
      if (received > 8 * 1024 * 1024) { stop("output-limit"); return; }
      buffer += data;
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) { consume(buffer.slice(0, index)); buffer = buffer.slice(index + 1); }
      if (Buffer.byteLength(buffer) > 1024 * 1024) stop("output-limit");
    });
    child.stderr.on("data", (data) => {
      received += data.length;
      if (received > 8 * 1024 * 1024) stop("output-limit");
      // Do not retain stderr: authentication tools may print credential material.
    });
    child.on("error", (error) => { reason = error.code === "ENOENT" ? "executor-unavailable" : "process-error"; });
    child.stdin.on("error", () => { /* EPIPE is expected when the executor refuses startup. */ });
    child.on("spawn", () => {
      options.onSpawn?.(child.pid);
      child.stdin.end(options.input ?? "");
    });
    child.on("close", (code) => {
      if (buffer) consume(buffer);
      clearTimeout(timer); clearTimeout(escalation); clearInterval(watcher);
      process.removeListener("SIGINT", onSignal); process.removeListener("SIGTERM", onSignal);
      const status = reason ?? (code === 0 && metrics.completed && !metrics.failed ? "completed" : "failed");
      resolveResult({ status, exitCode: code, durationMs: Date.now() - started,
        usage: metrics.usage,
        usageStatus: metrics.usage === null ? "unavailable" : (status !== "completed" || metrics.missingUsage ? "partial" : "reported"),
        result: metrics.result });
    });
  });
}

export async function runTask(root, store, id, policy) {
  if (existsSync(join(store, "STOP"))) throw new Error("Execução suspensa. Use enable para retirar STOP.");
  const dir = taskDirectory(store, id), state = loadState(store, id);
  if (!["queued", "needs-attention", "rejected"].includes(state.status)) throw new Error(`Estado ${state.status} não permite executar.`);
  if (state.attempts.length >= policy.maxAttempts) throw new Error("Limite de tentativas atingido. Revise a causa antes de definir outra tarefa.");
  git(root, "fetch", "origin");
  const base = git(root, "rev-parse", "dev");
  if (base !== git(root, "rev-parse", "origin/dev")) throw new Error("Atualize dev por fast-forward antes de executar.");
  git(root, "merge-base", "--is-ancestor", "origin/main", "dev");
  const context = prepare(root, state.task, policy, state.base ?? base);
  if (context.digest !== state.taskDigest) throw new Error("Contrato alterado desde a entrada na fila.");
  const profile = policy.profiles[state.task.profile];
  const previousResult = state.attempts.length ? [
    "\n\nEsta é uma retomada na mesma worktree. Confira o diff existente; preserve alterações válidas.",
    `Resultado anterior: ${state.attempts.at(-1).status}.`,
    `Revisão anterior: ${state.review?.evidence ?? "Sem atestação; confira impedimentos antes de repetir trabalho."}`,
  ].join("\n") : "";
  const prompt = context.prompt + previousResult;
  if (Buffer.byteLength(prompt) > policy.maxContextBytes) throw new Error("Contexto da retomada excede o limite; revise as referências.");
  const branch = `codex/task-${id}`;
  const workspace = state.workspace ?? join(dirname(dirname(store)), ".dev-tasks", "worktrees", id);
  if (!state.workspace) {
    mkdirSync(dirname(workspace), { recursive: true, mode: 0o700 });
    git(root, "worktree", "add", "-b", branch, workspace, "dev");
    Object.assign(state, { workspace, base });
    writeJson(join(dir, "state.json"), state);
  } else if (git(workspace, "branch", "--show-current") !== branch || git(workspace, "rev-parse", "HEAD") !== state.base) {
    throw new Error("Branch ou commit da worktree mudou; revise antes de retomar.");
  }
  if (existsSync(join(store, "STOP"))) throw new Error("Execução suspensa antes de iniciar o modelo.");
  const attemptDir = join(dir, `attempt-${state.attempts.length + 1}`);
  mkdirSync(attemptDir, { mode: 0o700 });
  const promptFile = join(attemptDir, "prompt.txt");
  writeFileSync(promptFile, prompt, { mode: 0o600 });
  const call = invocation(profile, state.task, workspace, promptFile);
  const attempt = { number: state.attempts.length + 1, startedAt: new Date().toISOString(),
    status: "running", executor: profile.executor, requestedModel: profile.model, reasoning: profile.reasoning,
    contextBytes: Buffer.byteLength(prompt), usage: null, usageStatus: "unavailable" };
  state.attempts.push(attempt); state.status = "running"; state.review = null;
  const save = () => writeJson(join(dir, "state.json"), state);
  save();
  const outcome = await runProcess(call.command, call.args, {
    workspace, executor: profile.executor, input: profile.executor === "codex" ? prompt : "",
    timeoutMs: profile.timeoutSeconds * 1000, stopFile: join(store, "STOP"),
    onSpawn: (pid) => { attempt.pid = pid; save(); },
  });
  writeFileSync(join(attemptDir, "result.txt"), outcome.result, { mode: 0o600 });
  const record = { ...outcome };
  delete record.result;
  Object.assign(attempt, record, { finishedAt: new Date().toISOString() });
  state.status = "needs-attention";
  save();
  const changes = changedPaths(workspace, state.base);
  const violations = scopeViolations(state.task, changes);
  if (git(workspace, "branch", "--show-current") !== branch || git(workspace, "rev-parse", "HEAD") !== state.base) violations.push("git: branch ou commit alterado");
  Object.assign(attempt, { changes, violations });
  state.status = outcome.status === "completed" && violations.length === 0 ? "awaiting-review" : "needs-attention";
  save();
  return state;
}

export function changedPaths(workspace, base) {
  return [...new Set([
    ...git(workspace, "diff", "--name-only", "--no-renames", "-z", base).split("\0"),
    ...git(workspace, "ls-files", "--others", "--exclude-standard", "-z").split("\0"),
  ].filter(Boolean))];
}

export function review(store, id, input) {
  const state = loadState(store, id);
  if (state.status !== "awaiting-review") throw new Error("A tarefa não está aguardando revisão.");
  if (!input || !["accepted", "rejected"].includes(input.result) || typeof input.evidence !== "string"
    || input.evidence.length < 10 || input.evidence.length > 2000 || !Number.isSafeInteger(input.corrections) || input.corrections < 0) throw new Error("Informe result, evidence e corrections válidos.");
  const violations = scopeViolations(state.task, changedPaths(state.workspace, state.base));
  if (violations.length) throw new Error("Existem mudanças fora do escopo; não é possível aceitar a tarefa.");
  state.review = { ...input, recordedAt: new Date().toISOString(), head: git(state.workspace, "rev-parse", "HEAD"),
    trackedDiffDigest: digest(git(state.workspace, "diff", "--binary", state.base)), note: "Atestação local; não substitui os gates nem a revisão do PR." };
  state.attempts.at(-1).review = state.review;
  state.status = input.result;
  writeJson(join(taskDirectory(store, id), "state.json"), state);
  return state;
}

export function report(states) {
  return states.map((state) => ({
    id: state.id, profile: state.task.profile, mode: state.task.mode, status: state.status,
    attempts: state.attempts.length, durationMs: state.attempts.every((a) => Number.isFinite(a.durationMs))
      ? state.attempts.reduce((sum, a) => sum + a.durationMs, 0) : null,
    usageStatus: state.attempts.length && state.attempts.every((a) => a.usageStatus === "reported") ? "reported" : "unavailable-or-partial",
    reportedTokens: state.attempts.some((a) => a.usage !== null)
      ? state.attempts.reduce((sum, a) => sum + (a.usage ? a.usage.input + a.usage.output : 0), 0) : null,
    corrections: state.attempts.some((attempt) => attempt.review)
      ? state.attempts.reduce((sum, attempt) => sum + (attempt.review?.corrections ?? 0), 0)
      : state.review?.corrections ?? null,
    quotaPercent: null,
  }));
}

export const rootDirectory = () => resolve(git(process.cwd(), "rev-parse", "--show-toplevel"));
