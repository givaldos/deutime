---
release: R08M
work_package: WP-R08M-03
scope: event_share_card_preview_pilot
branch_or_commit: "dev"
checkpoint: CP3
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
  - "WP-R08M-03: sonda pgTAP 25/25; banco completo 44 arquivos/1.080 testes"
  - "WP-R08M-03: 62 arquivos/355 testes Vitest; smoke e telemetria redigida verdes"
  - "build Next.js 16.3 com Webpack: aprovado; Turbopack local limitado pelo sandbox"
  - "npm audit: zero vulnerabilidades"
blocker: null
next_action: "Integrar a preparação do WP-R08M-03; após o deploy, confirmar a sonda desligada, ativar event_share_card somente em demo-campo pela RPC auditada e executar saúde, smoke e previews físicos."
---

# Trabalho atual

WP-R08M-03 preparou a sonda agregada restrita a `service_role`, telemetria
redigida, smoke anônimo de HTML/GET/HEAD do PNG e o roteiro de ativação e
rollback. A coorte histórica `demo-campo` foi confirmada sem versionar UUID,
operador ou evento.

O checkpoint avançou para CP3 sem ativar nenhum time. A retomada começa após o
deploy da sonda: confirmar `EXPECT_EVENT_SHARE_CARD_ENABLED=false`, ativar só a
coorte autorizada pela RPC, repetir saúde e smoke e coletar os previews físicos
antes de avançar CP4/CP5.
