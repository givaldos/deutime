---
release: R13
work_package: WP-R13-04
scope: schedule_conflicts_and_lifecycle
branch_or_commit: "26f9875"
checkpoint: CP4
status: idle
completed_ac:
  - AC-R13-01
  - AC-R13-02
  - AC-R13-03
  - AC-R13-04
  - AC-R13-05
  - AC-R13-06
  - AC-R13-07
  - AC-R13-08
  - AC-R13-09
  - AC-R13-10
  - AC-R13-11
  - AC-R13-12
  - AC-R13-13
  - AC-R13-14
  - AC-R13-15
  - AC-R13-16
dirty_files: []
tests:
  - "VAL-APP: 119 arquivos e 585 testes; lint, TypeScript, contexto e build Webpack verdes"
  - "VAL-DB: 67 arquivos e 1.739 testes pgTAP; WP-R13-04 com 43 casos; db lint sem alerta novo"
  - "VAL-OPS: migrations preservadas e auditoria com zero vulnerabilidades"
  - "VAL-PROD: Deploy Supabase 33778380681 e smoke 33778455290 verdes; professional_enabled=0"
blocker: null
next_action: "Iniciar WP-R13-05 em branch temporária nova a partir de dev sincronizada; manter professional_scheduling desligada."
---

# Trabalho atual

A R13 concluiu o `WP-R13-04` em CP4. `events` permanece como ocorrência
canônica e `professional_scheduling` segue desligada por padrão.

Conflitos são uma projeção privada recalculada; decisões e exceções ficam em
trilha imutável. Série, URL, convidados, respostas, vínculos e fatos não são
reescritos por remarcação, adiamento, data a definir ou cancelamento.

A fatia de Pendências da agenda, RPCs idempotentes, autorização por papel,
ciclo da agenda e comunicação posterior à decisão está validada e implantada.
`main` foi reconciliada em `dev`, a branch temporária foi removida e o
checkpoint fica `idle` para o `WP-R13-05`.
