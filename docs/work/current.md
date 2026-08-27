---
release: R12
work_package: WP-R12-03
scope: account_relationships_and_lifecycle
branch_or_commit: "codex/r12-account-links"
checkpoint: idle
status: done
completed_ac:
  - AC-R12-06
  - AC-R12-07
  - AC-R12-08
  - AC-R12-09
  - AC-R12-10
dirty_files: []
tests:
  - "lint, TypeScript, 106 arquivos/527 testes e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela abertura de porta no sandbox"
  - "61 arquivos/1.543 testes pgTAP, reset, tipos, lint sem alerta novo e integridade de migrations aprovados"
  - "50 provas focadas positivas, negativas, cross-tenant e concorrentes"
  - "smoke local em 360 px: flag off/on, confirmações sensíveis, sem overflow e console limpo"
  - "npm audit sem vulnerabilidades"
blocker: null
next_action: "Iniciar WP-R12-04 pelo outbox idempotente e sem PII do aviso de novo cadastro pendente."
---

# Trabalho atual

A R12 está ativa. O `WP-R12-03` entregou em `/me` a gestão isolada de vínculos,
saída segura, tratamento concorrente do último proprietário e encerramento
reautenticado da conta com minimização e reconciliação idempotentes.

App, banco, worker e jornada mobile foram validados. O próximo pacote é
`WP-R12-04`: avisar os responsáveis elegíveis quando um novo cadastro público
entrar como pendente, sem PII e sem duplicação.
