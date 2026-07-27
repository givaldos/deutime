---
release: R01
work_package: WP-R01-01
scope: event_control
branch_or_commit: "0466d04"
checkpoint: CP0
status: ready
completed_ac: []
dirty_files:
  - "docs/releases/R01-evento-sob-controle.md"
  - "docs/releases/README.md"
  - "docs/work/current.md"
tests:
  - "baseline de produção 0466d04 — CI, banco, CodeQL, Terraform check e smoke verdes"
  - "npm test -- lib/validation/operations.test.ts — 8 testes"
blocker: null
next_action: "Executar CP1: definir migration forward-only, assinaturas das RPCs, conversão de fuso e máquina de estados antes do código."
---

# Trabalho atual

R01 está pronta para implementação. O CP0 fechou resultado, escopo, papéis,
fuso autoritativo, histórico, idempotência, versão futura, rollout e validação.
Nenhuma migration ou jornada foi alterada. O próximo passo é o CP1 técnico.
