---
release: R02
work_package: WP-R02-01
scope: public_event_page
branch_or_commit: "codex/r02-public-event-page"
checkpoint: idle
status: completed
completed_ac:
  - "AC-R02-01"
  - "AC-R02-02"
  - "AC-R02-10"
dirty_files: []
tests:
  - "Vitest focado — 8 testes aprovados"
  - "mobile 390 × 844 — conteúdo, CTA e ausência de overflow verificados"
  - "flag local ativa — rota 200 e metadata contextual"
  - "flag local ausente — rota 404"
  - "HTML de /e — sem recurso do GTM"
  - "headers no build local — no-store, no-referrer e noindex"
  - "npm run verify — lint, tipos, 88 testes e build aprovados"
  - "npm run security:audit — 0 vulnerabilidades"
blocker: null
next_action: "Abrir o CP3 de WP-R02-01 e automatizar regressões da rota anônima: resposta indistinguível para ausente/flag/banco N−1, estados cancelado/concluído, headers, metadata e ausência de terceiros."
---

# Trabalho atual

O CP2 de `WP-R02-01` publicou o caminho fino mobile da URL canônica sem ativar
nenhum time. A rota usa somente a projeção anônima, tolera banco N−1 com 404,
mantém evento cancelado/concluído informativo e encaminha o atleta à agenda
autenticada existente.

A abertura inicial não renderiza GTM e recebe headers contra referência, cache
e indexação. Capability e RSVP continuam desligados e não foram implementados.
A próxima ação é transformar as evidências manuais da rota em regressões
automatizadas no CP3 antes de qualquer piloto.
