import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPolicy, prepare } from "./core.mjs";
import { enqueue, listStates, loadState, locked, recover, report, review, rootDirectory, runTask, storage, taskDirectory } from "./runner.mjs";

const usage = `Uso: npm run task -- <comando>
  prepare <arquivo.json>             Valida contrato e grava contexto sem chamar modelo
  add <arquivo.json>                 Adiciona tarefa à fila local, sem executar
  run <id>                          Mostra tarefa e limites; não chama modelo
  run <id> --execute                Executa uma tentativa na worktree isolada
  status [id]                       Mostra estado e evidências locais
  review <id> <revisao.json>         Registra aceite/rejeição com evidência e correções
  report                            Relatório de consumo disponível por tarefa
  stop                              Impede execuções e interrompe o executor ativo
  enable                            Retira STOP; não inicia tarefas
  recover                           Recupera estado após encerramento inesperado

Revisão: {"result":"accepted|rejected","evidence":"evidência verificável","corrections":0}
Este controlador não faz commit, push, merge, deploy ou limpeza de worktrees.`;

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help") { console.log(usage); return; }
  const arities = { prepare: [1], add: [1], run: [1, 2], status: [0, 1], review: [2], report: [0], stop: [0], enable: [0], recover: [0] };
  if (!arities[command]?.includes(args.length) || (command === "run" && args.length === 2 && args[1] !== "--execute")) throw new Error(usage);
  const root = rootDirectory(), policy = loadPolicy(root), store = storage(root);
  const readJson = (path) => JSON.parse(readFileSync(resolve(path), "utf8"));
  let result;
  if (command === "prepare") {
    const task = readJson(args[0]);
    const context = prepare(root, task, policy);
    const path = join(store, `preview-${task.id}.txt`);
    writeFileSync(path, context.prompt, { mode: 0o600 });
    result = { id: task.id, profile: task.profile, contextBytes: context.bytes, commit: context.commit, promptFile: path, executed: false };
  } else if (command === "add") result = await locked(store, () => enqueue(root, store, readJson(args[0]), policy));
  else if (command === "run") {
    if (args[1] === "--execute") {
      result = await locked(store, () => runTask(root, store, args[0], policy));
      if (result.status !== "awaiting-review") process.exitCode = 1;
    } else {
      const state = loadState(store, args[0]);
      result = { id: state.id, status: state.status, task: state.task, profile: policy.profiles[state.task.profile], attempts: state.attempts.length, maxAttempts: policy.maxAttempts, executed: false };
    }
  } else if (command === "status") result = args[0] ? loadState(store, args[0]) : report(listStates(store));
  else if (command === "report") result = report(listStates(store));
  else if (command === "review") result = await locked(store, () => review(store, args[0], readJson(args[1])));
  else if (command === "stop") {
    writeFileSync(join(store, "STOP"), "Execução suspensa explicitamente.\n", { mode: 0o600 });
    result = { stopped: true };
  } else if (command === "enable") result = await locked(store, () => {
    if (existsSync(join(store, "STOP"))) unlinkSync(join(store, "STOP"));
    return { enabled: true, executed: false };
  });
  else if (command === "recover") result = { recovered: recover(store) };
  if (result?.id && command === "add") {
    console.log(JSON.stringify({ id: result.id, status: result.status, attempts: result.attempts.length, executed: false }, null, 2));
  } else if (result?.id && command === "run" && args[1] === "--execute") {
    console.log(JSON.stringify({ id: result.id, status: result.status, workspace: result.workspace,
      evidence: taskDirectory(store, result.id), attempt: result.attempts.at(-1) }, null, 2));
  } else console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.status !== undefined ? "Falha de Git. Confira origin, dev atualizada e reconciliação com main." : error.message);
  process.exitCode = 1;
});
