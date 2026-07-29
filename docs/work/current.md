---
release: R02
work_package: WP-R02-01
scope: public_event_anonymous_regressions
branch_or_commit: "codex/r02-public-event-regressions"
checkpoint: idle
status: completed
completed_ac:
  - "AC-R02-01"
  - "AC-R02-02"
  - "AC-R02-10"
dirty_files:
  - "app/p/[handle]/page.tsx (preexistente, fora do escopo)"
  - "docs/roadmap.md (preexistente, fora do escopo)"
tests:
  - "Vitest focado — 3 arquivos e 15 testes aprovados"
  - "npm run lint — aprovado"
  - "npm run typecheck — aprovado"
  - "Vitest completo — 16 arquivos e 100 testes aprovados"
  - "npm run build — aprovado"
  - "npm run security:audit — 0 vulnerabilidades"
blocker: null
next_action: "Selecionar o time piloto, ativar public_event_page somente nele e executar smoke anônimo com um public_id real."
---

# Trabalho atual

O CP3 de `WP-R02-01` automatizou a fronteira anônima da página pública. Os
testes cobrem 404 indistinguível, compatibilidade com banco N−1, estados
informativos, metadata não indexável, projeção mínima e ausência de terceiros.

A vertical está pronta para seleção do time piloto. A ativação continua manual,
por time, e não liga capability nem RSVP.
