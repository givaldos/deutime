---
release: R13
work_package: WP-R13-02
scope: internal_teams_and_defaults
branch_or_commit: "codex/r13-entry-expansion"
checkpoint: CP2
status: active
completed_ac:
  - AC-R13-01
  - AC-R13-02
  - AC-R13-03
  - AC-R13-04
  - AC-R13-16
dirty_files: []
tests:
  - "migration forward-only; professional_scheduling desligada, fora do rollout global e compatível N/N−1"
  - "dashboard, jogo único/recorrente, progresso persistido do campeonato e fallback validados em 390 × 844"
  - "lint, TypeScript, 118 arquivos/569 testes de aplicação e 4 testes de contexto aprovados"
  - "64 arquivos/1.629 testes pgTAP, db lint e integridade de migrations aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado apenas pela abertura de porta no sandbox"
  - "auditoria com zero vulnerabilidades"
blocker: null
next_action: "Executar WP-R13-02: criar equipes internas persistentes, exigir duas identidades válidas e configurar as duas equipes padrão do time, mantendo a flag desligada."
---

# Trabalho atual

A R13 concluiu o `WP-R13-01` em CP2. A expansão `professional_scheduling`
permanece inerte e desligada; a aplicação tolera banco N−1 e o banco tolera
aplicação N−1.

Owner/admin vê **Novo jogo** e **Novo campeonato** somente com as duas flags
necessárias. O jogo separa ocorrência de recorrência; o campeonato retoma a
etapa pelo rascunho persistido. Manager e flag desligada preservam o fallback.

A próxima frente permitida é `WP-R13-02`: equipes internas persistentes, duas
identidades válidas e padrões do time, ainda sem ativação em produção.
