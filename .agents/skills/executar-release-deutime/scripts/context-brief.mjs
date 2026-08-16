#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MAX_DIRTY_PATHS = 12;
const ALLOWED_OPTIONS = new Set(["--ids", "--map"]);
const options = new Set(process.argv.slice(2));

function fail(message) {
  process.stderr.write(`context:brief: ${message}\n`);
  process.exit(1);
}

for (const option of options) {
  if (!ALLOWED_OPTIONS.has(option)) fail(`opcao desconhecida: ${option}. Use --ids ou --map.`);
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
    .filter(({ line }) => /^#{2,3}\s+/.test(line));
}

function lineOf(lines, pattern) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? null : index + 1;
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

function gitRef(root) {
  const branch = git(["branch", "--show-current"], root);
  return branch || git(["rev-parse", "--short", "HEAD"], root);
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
  process.stdout.write("CONTEXTO\n");
  process.stdout.write(`- Release: nenhuma; estado: ${scalar(currentYaml, "status") || "idle"}\n`);
  process.stdout.write(`- Proxima acao: ${scalar(currentYaml, "next_action") || "selecionar o proximo pacote"}\n`);
  printWorktree(dirty);
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
const releaseLines = releaseMarkdown.split(/\r?\n/);
const workPackage = scalar(currentYaml, "work_package") || "nao informado";
const recordedRef = scalar(currentYaml, "branch_or_commit") || "nao informado";
const actualRef = gitRef(root);

process.stdout.write("CONTEXTO\n");
process.stdout.write(`- Release: ${release}; pacote: ${workPackage}; checkpoint: ${scalar(currentYaml, "checkpoint") || "nao informado"}; estado: ${scalar(currentYaml, "status") || "nao informado"}\n`);
process.stdout.write(`- Git: ${actualRef}${actualRef === recordedRef ? "" : `; checkpoint registra: ${recordedRef}`}\n`);
process.stdout.write(`- Fonte: ${releaseRelative}\n`);
process.stdout.write(`- Proxima acao: ${scalar(currentYaml, "next_action") || "nao informada"}\n`);

printWorktree(dirty);

const references = Object.fromEntries(
  ["baseline", "decisions", "invariants"].map((key) => [key, list(releaseYaml, key)]),
);
process.stdout.write("\nREFERENCIAS\n");
process.stdout.write(`- baseline ${references.baseline.length}; decisions ${references.decisions.length}; invariants ${references.invariants.length}. Detalhar: npm run context:brief -- --ids\n`);

const windows = [
  ["resultado", /^## Resultado demonstr[aá]vel/i],
  ["contratos", /^## Contratos e decis[oõ]es/i],
  ["entrypoints", /^## Entry points/i],
  ["pacotes", /^## Pacotes de trabalho/i],
  ["criterios", /^## Crit[eé]rios de aceite/i],
  ["riscos", /^## Riscos e controles/i],
  ["validacao", /^## Valida[cç][aã]o/i],
  ["rollout", /^## Rollout/i],
].map(([label, pattern]) => [label, lineOf(releaseLines, pattern)]);
const currentWorkLine = releaseLines.findIndex((line) => line.includes(`\`${workPackage}\``));
const formattedWindows = windows
  .filter(([, line]) => line !== null)
  .map(([label, line]) => `${label} L${line}`);
if (currentWorkLine !== -1) formattedWindows.splice(4, 0, `WP atual L${currentWorkLine + 1}`);

process.stdout.write("\nJANELAS\n");
process.stdout.write(`- ${formattedWindows.join("; ")}\n`);

if (options.has("--ids")) {
  process.stdout.write("\nIDS\n");
  for (const [key, values] of Object.entries(references)) {
    process.stdout.write(`- ${key}: ${values.length ? values.join(", ") : "nenhum"}\n`);
  }
}

if (options.has("--map")) {
  process.stdout.write("\nMAPA COMPLETO\n");
  for (const heading of headings(releaseMarkdown)) {
    process.stdout.write(`- L${heading.number}: ${heading.line}\n`);
  }
}
