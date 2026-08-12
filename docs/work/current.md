---
release: R08M
work_package: WP-R08M-03
scope: event_share_card_preview_pilot
branch_or_commit: "dev"
checkpoint: CP2
status: ready
completed_ac:
  - AC-R08M-01
  - AC-R08M-02
  - AC-R08M-03
  - AC-R08M-04
  - AC-R08M-05
  - AC-R08M-06
  - AC-R08M-07
  - AC-R08M-08
  - AC-R08M-09
  - AC-R08M-10
dirty_files: []
tests:
  - "pgTAP focado R08M: 40/40 assertions aprovadas"
  - "db:reset: reconstrução limpa; db:test: 43 arquivos e 1.055 testes aprovados"
  - "db:lint: nenhum aviso novo; db:types: somente RPC e enum R08M"
  - "WP-R08M-02 focado: 38/38 casos de página, metadata, PNG e fallback aprovados"
  - "Vitest: 61 arquivos e 347 testes aprovados; TypeScript e ESLint verdes"
  - "build Next.js 16.3 com Webpack: aprovado; Turbopack local limitado pelo sandbox"
  - "npm audit: zero vulnerabilidades"
blocker: null
next_action: "Executar WP-R08M-03: preparar coorte demo, telemetria redigida e runbook; então ativar somente a coorte autorizada para previews físicos, smoke e rollback."
---

# Trabalho atual

WP-R08M-02 conectou a projeção anônima a metadata, HTML e `convite.png`. As oito
fases compartilham a mesma apresentação e versão opaca, consentimento revogado
invalida o preview sem levar identidade à URL, e a imagem preserva headers de
privacidade e cache compatíveis com crawlers.

O checkpoint avançou para CP2 sem ativar nenhum time. A retomada começa em
WP-R08M-03, preparando coorte demo, telemetria redigida, runbook e rollback
antes de pedir autorização para habilitar a flag e conferir os previews reais.
