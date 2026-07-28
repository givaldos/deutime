---
release: R01
work_package: CP5-R01
scope: event_control
branch_or_commit: "1cb1640"
checkpoint: CP5
status: in_progress
completed_ac:
  - "AC-R01-01"
  - "AC-R01-02"
  - "AC-R01-03"
  - "AC-R01-04"
  - "AC-R01-05"
  - "AC-R01-06"
  - "AC-R01-07"
dirty_files:
  - "app/app/[teamSlug]/events/actions.ts"
  - "docs/releases/R01-evento-sob-controle.md"
  - "docs/runbook.md"
  - "docs/work/current.md"
  - "lib/observability/event-control.test.ts"
  - "lib/observability/event-control.ts"
tests:
  - "APP_URL=https://deutime.app npm run smoke:production — ok"
  - "baseline 6551bdb — checks produtivos verdes"
  - "npm run verify — 13 arquivos/78 testes e build"
  - "npm run security:audit — 0 vulnerabilidades"
  - "ensaio local — event_control e kill switches terminaram false"
  - "PR #22 aberto — checks automatizados devem ser confirmados antes do merge"
  - "PR #22 integrado — CI, Database, CodeQL, Terraform e Deploy database verdes"
  - "smoke automático 30375783530 e repetição manual em produção — ok"
  - "produção — integration_produce=false e integration_consume=false"
  - "piloto Demo Society — event_control=true com auditoria confirmada"
  - "criação e cancelamento com replay — 2 comandos, 2 mudanças e 0 divergências"
  - "smoke pós-operação — ok; integrações externas permaneceram desligadas"
blocker: "Falta o operador entrar no DeuTime e confirmar visualmente, em viewport móvel, a jornada habilitada do Demo Society."
next_action: "O operador autentica em https://deutime.app, abre o Demo Society no celular e confirma que criação/edição usam o fluxo novo e que o evento de demonstração aparece cancelado."
---

# Trabalho atual

O piloto técnico está ativo somente no `Demo Society`. A ativação auditada,
os replays de criação e cancelamento, a integridade transacional, os kill
switches e os smokes foram validados em produção. O CP5 permanece em andamento
até o operador confirmar visualmente a jornada autenticada no celular; os
demais times continuam com `event_control` desligada.
