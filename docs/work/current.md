---
release: R01
work_package: CP5-R01
scope: event_control
branch_or_commit: "ee45409"
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
blocker: "O piloto exige selecionar um time real, confirmar owner/admin ativo e obter consentimento antes de habilitar event_control."
next_action: "Selecionar um único time piloto e seu owner/admin; confirmar a flag desligada no SQL Editor e só então executar a ativação auditada descrita no runbook."
---

# Trabalho atual

O deploy inerte do CP5 foi concluído na `main`: aplicação, banco, checks e
smokes estão verdes, e os kill switches permanecem desligados. A capacidade
`event_control` continua desligada por padrão. O CP5 permanece em andamento
até que um único time piloto seja escolhido, seu owner/admin ativo e
consentimento sejam confirmados e a ativação auditada seja acompanhada pelas
métricas e critérios de interrupção do runbook.
