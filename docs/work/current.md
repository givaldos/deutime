---
release: R13
work_package: WP-R13-02
scope: internal_teams_and_defaults
branch_or_commit: "d67736b"
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
  - AC-R13-16
dirty_files: []
tests:
  - "migration forward-only; professional_scheduling desligada, fora do rollout global e compatível N/N−1"
  - "dashboard, jogo único/recorrente, progresso persistido do campeonato e fallback validados em 390 × 844"
  - "lint, TypeScript, 118 arquivos/573 testes de aplicação e 4 testes de contexto aprovados"
  - "65 arquivos/1.665 testes pgTAP, db lint e integridade de migrations aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado apenas pela abertura de porta no sandbox"
  - "auditoria com zero vulnerabilidades"
  - "390 x 844: configuração, estado incompleto, jogo predefinido e campeonato pré-selecionado sem overflow ou erros de console"
  - "PRs #365 e #366 aprovados; produção d67736b com deploy Supabase 33529467589 e smoke somente leitura 33529857819 verdes"
  - "sonda pós-deploy: professional_flags=0, professional_enabled=0 e três configurações padrão retrocompatíveis"
blocker: null
next_action: "Iniciar WP-R13-03 em branch temporária nascida de dev sincronizada, mantendo professional_scheduling desligada."
---

# Trabalho atual

A R13 concluiu o `WP-R13-02` em CP4. A expansão `professional_scheduling`
chegou inerte e desligada à produção; aplicação e banco preservam a matriz N/N−1.

Owner/admin mantém de 2 a 12 equipes e duas identidades padrão distintas.
Novo jogo preenche os lados, campeonato pré-seleciona participantes e ambos
congelam snapshots sem reescrever RSVP, fatos ou classificação.

Os gates, o deploy do banco, a sonda pós-deploy e o smoke somente leitura
passaram. A próxima frente permitida é `WP-R13-03`.
