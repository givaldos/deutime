---
release: R01
work_package: CP6-R01
scope: event_control
branch_or_commit: "codex/r01-close-pilot"
checkpoint: idle
status: completed
completed_ac:
  - "AC-R01-01"
  - "AC-R01-02"
  - "AC-R01-03"
  - "AC-R01-04"
  - "AC-R01-05"
  - "AC-R01-06"
  - "AC-R01-07"
dirty_files: []
tests:
  - "produção autenticada — raiz redirecionou para /app/demo-society"
  - "criação às 20:00, remarcação para 20:30 e cancelamento — ok"
  - "integridade — versão 3, 3 comandos, 3 mudanças e 0 divergências"
  - "rollout — 1 time habilitado e integrações externas desligadas"
  - "operador temporário — vínculo removido e conta bloqueada"
  - "APP_URL=https://deutime.app npm run smoke:production — ok"
blocker: null
next_action: "Abrir o CP0 da R02 e fechar as decisões DEC-EVENT-PUBLIC-MINIMUM e DEC-UNCLAIMED-IDENTITY antes de implementar."
---

# Trabalho atual

A R01 foi concluída após o piloto autenticado no `Demo Society`. Criação,
remarcação, cancelamento, histórico, fuso autoritativo, integridade
transacional, fallback e controles operacionais foram confirmados. O único
operador técnico criado para a validação não possui mais vínculo e está
bloqueado; o registro permanece apenas para preservar a trilha auditável dos
comandos de demonstração.
