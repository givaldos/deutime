---
release: R12
work_package: WP-R12-05
scope: event_options
branch_or_commit: "5b375d2"
checkpoint: idle
status: done
completed_ac:
  - AC-R12-14
  - AC-R12-15
dirty_files: []
tests:
  - "18 provas focadas no app para catálogo, limites, criação, edição e fallback N/N-1"
  - "lint, TypeScript, 114 arquivos/554 testes e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela abertura de porta no sandbox"
  - "reset, tipos, lint sem alerta novo e 62 arquivos/1.596 testes pgTAP aprovados"
  - "28 provas pgTAP focadas em privilégio, DST, recorrência, replay, edição, limites e cross-tenant"
  - "integridade das migrations aprovada e npm audit sem vulnerabilidades"
  - "PRs #340 e #341 aprovadas; Vercel e migration Supabase publicados no commit 5b375d2"
  - "CI, Database, CodeQL, Terraform e smoke público read-only de produção aprovados"
blocker: null
next_action: "Iniciar WP-R12-06 pela matriz N/N-1, regressão dos links antigos e jornada física em 360 px."
---

# Trabalho atual

O `WP-R12-05` está concluído em produção. Criação, edição e recorrência usam o
mesmo catálogo de duração e fechamento de confirmação, validado tanto no app
quanto nas RPCs transacionais. O fallback para v2 cobre somente a ausência de v3
durante a ordem de deploy e não contorna rejeições funcionais.

O commit `5b375d2` foi publicado no Vercel e no Supabase, passou pelos gates
completos e pelo smoke público read-only. `main` foi sincronizada de volta em
`dev` pela PR `#342`. A próxima execução é o `WP-R12-06`, que fecha a robustez,
o piloto e a recuperação da R12.
