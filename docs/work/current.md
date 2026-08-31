---
release: R12
work_package: WP-R12-06
scope: robustness_pilot_recovery
branch_or_commit: "codex/r12-robustness-pilot"
checkpoint: CP4
status: active
completed_ac:
  - AC-R12-01
  - AC-R12-02
  - AC-R12-03
  - AC-R12-04
  - AC-R12-05
  - AC-R12-06
  - AC-R12-07
  - AC-R12-08
  - AC-R12-09
  - AC-R12-10
  - AC-R12-11
  - AC-R12-12
  - AC-R12-13
  - AC-R12-14
  - AC-R12-15
  - AC-R12-16
dirty_files:
  - components/athlete-registration-form.tsx
  - docs/releases/R12-confianca-e-autonomia.md
  - docs/releases/README.md
  - docs/runbook.md
  - docs/work/current.md
  - lib/database.types.ts
  - package.json
  - scripts/r12-pilot-health.d.mts
  - scripts/r12-pilot-health.mjs
  - scripts/r12-pilot-health.test.ts
  - supabase/migrations/202608310001_r12_pilot_health.sql
  - supabase/tests/063_r12_pilot_health.test.sql
tests:
  - "16 provas focadas de aplicação para sonda, N/N-1, links e opções do evento"
  - "reset local e 20 provas pgTAP focadas da nova sonda aprovados"
  - "matriz de sete arquivos/158 provas pgTAP da R12 aprovada"
  - "lint, TypeScript, 115 arquivos/557 testes de aplicação e 4 testes de contexto aprovados"
  - "63 arquivos/1.616 testes pgTAP, tipos, integridade das migrations e auditoria aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado pela abertura de porta interna"
  - "navegador em 360 px: rota legada segura, sem overflow/console e alvos de 44 a 66 px"
blocker: null
next_action: "Executar gates completos, publicar a expansão inerte e iniciar CP5 pela sonda produtiva com os três controles desligados."
---

# Trabalho atual

O `WP-R12-06` concluiu CP3 e CP4 localmente. A compatibilidade N/N−1, os links
antigos e a não-herança do rollout anterior estão cobertos por testes focados.
A nova sonda operacional é exclusiva da `service_role` e expõe somente estado
agregado necessário para piloto e rollback.

Em 360 px, o cadastro público e a rota legada passaram sem overflow ou erro de
console. O único alvo abaixo de 44 px foi corrigido. Conforme autorização do
responsável pelo produto, o navegador responsivo serve como proxy dos aparelhos
nesta release.

A próxima ação é cruzar CP5: gates completos, expansão inerte em produção,
sonda com os três controles desligados, piloto sintético e rollback exercitado
antes da ativação global.
