---
release: R12
work_package: WP-R12-05
scope: event_options
branch_or_commit: "codex/r12-event-options"
checkpoint: cp4
status: in_progress
completed_ac:
  - AC-R12-14
  - AC-R12-15
dirty_files:
  - "app/app/[teamSlug]/events/actions.ts"
  - "app/app/[teamSlug]/events/actions.test.ts"
  - "components/admin-event-form.tsx"
  - "components/admin-event-form.test.tsx"
  - "lib/domain/event-options.ts"
  - "lib/validation/operations.ts"
  - "lib/validation/operations.test.ts"
  - "lib/database.types.ts"
  - "supabase/migrations/202608290001_r12_event_options_contract.sql"
  - "supabase/tests/014_event_control.test.sql"
  - "docs/releases/R12-confianca-e-autonomia.md"
  - "docs/releases/README.md"
  - "docs/work/current.md"
tests:
  - "18 provas focadas no app para catálogo, limites, criação, edição e fallback N/N-1"
  - "lint, TypeScript, 114 arquivos/554 testes e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela abertura de porta no sandbox"
  - "reset, tipos, lint sem alerta novo e 62 arquivos/1.596 testes pgTAP aprovados"
  - "28 provas pgTAP focadas em privilégio, DST, recorrência, replay, edição, limites e cross-tenant"
  - "integridade das migrations aprovada e npm audit sem vulnerabilidades"
blocker: null
next_action: "Criar commit, abrir PR da branch temporária para dev e acompanhar os checks antes da promoção dev → main."
---

# Trabalho atual

O `WP-R12-05` implementou um contrato único para duração e fechamento da
confirmação em criação, edição e recorrência. A interface oferece durações comuns
até 480 minutos, duração personalizada de 15 a 480 minutos e os sete prazos
canônicos de confirmação.

O banco valida o mesmo contrato em RPCs v3 transacionais. O consumidor usa v2
somente quando v3 ainda não existe, preservando as duas ordens de deploy sem
contornar erros funcionais. Os gates locais de aplicação, banco, build,
migrations e segurança passaram. Falta promover a branch pelo fluxo obrigatório
e validar o estado consolidado antes de iniciar `WP-R12-06`.
