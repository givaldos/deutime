---
release: R13
work_package: WP-R13-05
scope: robustness_and_pilot
branch_or_commit: "7c5d8fd"
checkpoint: CP6
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
  - AC-R13-17
  - AC-R13-18
dirty_files: []
tests:
  - "VAL-APP: 123 arquivos e 600 testes; lint, TypeScript, contexto e build Webpack verdes"
  - "VAL-DB: 68 arquivos e 1.781 testes pgTAP; WP-R13-05 com 42 casos, incluindo duas sessões concorrentes"
  - "VAL-OPS: migrations preservadas, sonda sem PII e auditoria com zero vulnerabilidades"
  - "VAL-MOBILE: navegador autenticado em 360 x 800 sem overflow nem erro de console"
  - "VAL-PROD: commit 7c5d8fd; deploy 33817695568 e smoke 33817749972 verdes; três coortes demo saudáveis e desligadas"
blocker: null
next_action: "R13 encerrada; iniciar a próxima frente somente em nova tarefa e branch temporária criada a partir de dev sincronizada."
---

# Trabalho atual

A R13 concluiu o `WP-R13-05` e retornou a `idle` em CP6. `events` permanece
como ocorrência canônica e `professional_scheduling` segue desligada.

Conflitos são uma projeção privada recalculada; decisões e exceções ficam em
trilha imutável. Série, URL, convidados, respostas, vínculos e fatos não são
reescritos por remarcação, adiamento, data a definir ou cancelamento.

Locks por tenant, grants explícitos, ativação restrita a uma coorte, sonda
agregada sem PII e rollback preservando os fatos estão implantados e
validados. Produção recebeu a expansão inerte, o smoke passou e as três coortes
demo permanecem saudáveis e desligadas. A próxima frente exige nova tarefa.
