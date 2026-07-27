---
release: R01
work_package: WP-R01-01
scope: event_control
branch_or_commit: "a49ec8f"
checkpoint: CP1
status: complete
completed_ac: []
dirty_files:
  - "docs/releases/R01-evento-sob-controle.md"
  - "docs/work/current.md"
tests:
  - "baseline de produção 0466d04 — CI, banco, CodeQL, Terraform check e smoke verdes"
  - "npm test -- lib/validation/operations.test.ts — 8 testes"
blocker: null
next_action: "Iniciar CP2 pelo WP-R01-01: migrations de expansão, capacidade event_control, conversão autoritativa de fuso e caminho fino de criação/edição."
---

# Trabalho atual

R01 concluiu o contrato técnico do CP1. A expansão, RPCs, fuso, estados,
idempotência, efeitos, compatibilidade e testes estão definidos; nenhuma
migration ou jornada foi alterada. O próximo passo é o caminho fino do CP2.
