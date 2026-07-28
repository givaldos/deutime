---
release: R01
work_package: CP5-R01
scope: event_control
branch_or_commit: "codex/r01-series-extension"
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
blocker: "Deploy exige integração na main; piloto exige selecionar um time real e seu owner/admin após o smoke pós-deploy."
next_action: "Confirmar todos os checks e obter autorização explícita para o merge do PR #22; depois acompanhar os deploys de banco e Vercel e executar o smoke antes de selecionar o piloto."
---

# Trabalho atual

O CP5 está preparado no PR #22, mas ainda não foi promovido. A baseline
produtiva, o smoke somente leitura, a telemetria sem PII, as consultas de
integridade e o rollback estão documentados. A capacidade continua desligada
por padrão. Após todos os checks e a autorização explícita, o próximo passo é
integrar a branch na `main`, acompanhar os deploys e repetir o smoke; a escolha
e ativação de um único time piloto ocorre somente depois.
