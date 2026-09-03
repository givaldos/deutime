---
release: R13
work_package: WP-R13-05
scope: robustness_and_pilot
branch_or_commit: "codex/r13-robustez-piloto"
checkpoint: CP4
status: ready_for_pilot
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
dirty_files: []
tests:
  - "VAL-APP: 123 arquivos e 600 testes; lint, TypeScript, contexto e build Webpack verdes"
  - "VAL-DB: 68 arquivos e 1.781 testes pgTAP; WP-R13-05 com 42 casos, incluindo duas sessões concorrentes"
  - "VAL-OPS: migrations preservadas, sonda sem PII e auditoria com zero vulnerabilidades"
  - "VAL-MOBILE: navegador autenticado em 360 x 800 sem overflow nem erro de console"
blocker: null
next_action: "Promover branch para dev e main, verificar expansão inerte em produção, executar piloto sintético e rollback e encerrar a R13 em CP6."
---

# Trabalho atual

A R13 concluiu a validação local do `WP-R13-05` em CP4. `events` permanece como
ocorrência canônica e `professional_scheduling` segue desligada por padrão.

Conflitos são uma projeção privada recalculada; decisões e exceções ficam em
trilha imutável. Série, URL, convidados, respostas, vínculos e fatos não são
reescritos por remarcação, adiamento, data a definir ou cancelamento.

Locks por tenant, grants explícitos, ativação restrita a uma coorte, sonda
agregada sem PII e rollback preservando os fatos estão validados. A próxima
ação é promover a expansão inerte, executar o smoke e registrar o CP5–CP6.
