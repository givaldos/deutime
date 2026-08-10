#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const MAX_DIRTY_PATHS = 12;
const MAX_HEADINGS = 32;

function fail(message) {
  process.stderr.write(`context:brief: ${message}\n`);
  process.exit(1);
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function frontmatter(markdown, source) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail(`${source} nao possui frontmatter YAML.`);
  return match[1];
}

function scalar(yaml, key) {
  const match = yaml.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  if (!match) return "";
  const raw = match[1];
  if (raw === "null") return "null";
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw.replace(/^['"]|['"]$/g, "");
}

function list(yaml, key) {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) return [];

  const values = [];
  for (const line of lines.slice(start + 1)) {
    if (/^[A-Za-z_][\w-]*:/.test(line)) break;
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    if (match) values.push(match[1].replace(/^['"]|['"]$/g, ""));
  }
  return values;
}

function headings(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => /^#{2,3}\s+/.test(line))
    .slice(0, MAX_HEADINGS);
}

function printWorktree(dirty) {
  process.stdout.write("\nWORKTREE\n");
  if (dirty.length === 0) {
    process.stdout.write("- limpa\n");
    return;
  }

  for (const line of dirty.slice(0, MAX_DIRTY_PATHS)) process.stdout.write(`- ${line}\n`);
  if (dirty.length > MAX_DIRTY_PATHS) {
    process.stdout.write(`- ... mais ${dirty.length - MAX_DIRTY_PATHS} caminho(s)\n`);
  }
}

let root;
try {
  root = git(["rev-parse", "--show-toplevel"], process.cwd());
} catch {
  fail("execute o comando dentro do repositorio Git.");
}

const currentPath = join(root, "docs/work/current.md");
let current;
try {
  current = readFileSync(currentPath, "utf8");
} catch {
  fail("docs/work/current.md nao foi encontrado.");
}

const currentYaml = frontmatter(current, "docs/work/current.md");
const release = scalar(currentYaml, "release");
const dirty = git(["status", "--short"], root)
  .split(/\r?\n/)
  .filter(Boolean);

if (!release || release === "null") {
  process.stdout.write("CONTEXTO ATIVO\n");
  process.stdout.write("- Release: nenhuma\n");
  process.stdout.write(`- Estado: ${scalar(currentYaml, "status") || "idle"}\n`);
  process.stdout.write(`- Proxima acao: ${scalar(currentYaml, "next_action") || "selecionar o proximo pacote"}\n`);
  printWorktree(dirty);
  process.stdout.write("\nLEITURA POR DEMANDA\n");
  process.stdout.write("- Nao ha pacote ativo; nao carregue releases concluidas por prevencao.\n");
  process.stdout.write("- Para planejar uma nova release, consulte apenas o indice de roadmap e promova um pacote pelo template.\n");
  process.exit(0);
}

const releaseDir = join(root, "docs/releases");
const candidates = readdirSync(releaseDir).filter(
  (name) => name.startsWith(`${release}-`) && name.endsWith(".md"),
);
if (candidates.length !== 1) {
  fail(`esperava um pacote ${release}-*.md e encontrei ${candidates.length}.`);
}

const releaseRelative = `docs/releases/${candidates[0]}`;
const releaseMarkdown = readFileSync(join(releaseDir, candidates[0]), "utf8");
const releaseYaml = frontmatter(releaseMarkdown, releaseRelative);

const fields = [
  ["Release", release],
  ["Pacote", scalar(currentYaml, "work_package") || "nao informado"],
  ["Checkpoint", scalar(currentYaml, "checkpoint") || "nao informado"],
  ["Estado", scalar(currentYaml, "status") || "nao informado"],
  ["Branch/commit", scalar(currentYaml, "branch_or_commit") || "nao informado"],
];

process.stdout.write("CONTEXTO ATIVO\n");
for (const [label, value] of fields) process.stdout.write(`- ${label}: ${value}\n`);
process.stdout.write(`- Pacote da release: ${releaseRelative}\n`);
process.stdout.write(`- Proxima acao: ${scalar(currentYaml, "next_action") || "nao informada"}\n`);

printWorktree(dirty);

process.stdout.write("\nIDS REFERENCIADOS\n");
for (const key of ["baseline", "decisions", "invariants"]) {
  const values = list(releaseYaml, key);
  process.stdout.write(`- ${key}: ${values.length ? values.join(", ") : "nenhum"}\n`);
}

process.stdout.write("\nMAPA DE SECOES\n");
for (const heading of headings(releaseMarkdown)) {
  process.stdout.write(`- L${heading.number}: ${heading.line}\n`);
}

process.stdout.write("\nLEITURA POR DEMANDA\n");
process.stdout.write("- Comece pelo frontmatter, Resultado demonstravel e pacote de trabalho atual.\n");
process.stdout.write("- Abra Contratos, criterios, riscos e entrypoints apenas para a camada afetada.\n");
process.stdout.write("- Consulte evidencias historicas somente para regressao, auditoria ou passagem de checkpoint.\n");
process.stdout.write(`- Fonte do resumo: ${basename(currentPath)} + ${candidates[0]}.\n`);
