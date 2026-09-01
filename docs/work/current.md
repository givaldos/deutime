---
release: R13
work_package: WP-R13-02
scope: internal_teams_and_defaults
branch_or_commit: "codex/r13-teams-defaults"
checkpoint: CP4
status: active
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
dirty_files:
  - "app/app/[teamSlug]/events"
  - "app/app/[teamSlug]/championships"
  - "app/app/[teamSlug]/settings"
  - "components"
  - "lib"
  - "supabase/migrations/202609010002_r13_team_defaults_and_professional_creation.sql"
  - "supabase/tests/065_r13_team_defaults_and_professional_creation.test.sql"
tests:
  - "migration forward-only; professional_scheduling desligada, fora do rollout global e compatível N/N−1"
  - "dashboard, jogo único/recorrente, progresso persistido do campeonato e fallback validados em 390 × 844"
  - "lint, TypeScript, 118 arquivos/573 testes de aplicação e 4 testes de contexto aprovados"
  - "65 arquivos/1.665 testes pgTAP, db lint e integridade de migrations aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado apenas pela abertura de porta no sandbox"
  - "auditoria com zero vulnerabilidades"
  - "390 x 844: configuração, estado incompleto, jogo predefinido e campeonato pré-selecionado sem overflow ou erros de console"
blocker: null
next_action: "Promover codex/r13-teams-defaults para dev, executar gates consolidados, promover dev para main e comprovar em produção que professional_scheduling permanece desligada."
---

# Trabalho atual

A R13 validou o `WP-R13-02` em CP4. A expansão `professional_scheduling`
permanece inerte e desligada; aplicação e banco preservam a matriz N/N−1.

Owner/admin mantém de 2 a 12 equipes e duas identidades padrão distintas.
Novo jogo preenche os lados, campeonato pré-seleciona participantes e ambos
congelam snapshots sem reescrever RSVP, fatos ou classificação.

A ação atual é promover o pacote e comprovar o estado desligado em produção.
Depois do smoke, a próxima frente permitida é `WP-R13-03`.
