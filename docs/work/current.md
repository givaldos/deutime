---
release: R08M
work_package: WP-R08M-02
scope: event_share_card_consumer
branch_or_commit: "dev"
checkpoint: CP1
status: ready
completed_ac: []
dirty_files: []
tests:
  - "pgTAP focado R08M: 40/40 assertions aprovadas"
  - "db:reset: reconstrução limpa; db:test: 43 arquivos e 1.055 testes aprovados"
  - "db:lint: nenhum aviso novo; db:types: somente RPC e enum R08M"
  - "Vitest: 61 arquivos e 335 testes aprovados; TypeScript e ESLint verdes"
  - "build Next.js 16.3 com Webpack: aprovado; Turbopack local limitado pelo sandbox"
  - "npm audit: zero vulnerabilidades"
blocker: null
next_action: "Implementar WP-R08M-02 consumindo o DTO em metadata, HTML e convite.png, com fallback para flag desligada ou schema N-1."
---

# Trabalho atual

WP-R08M-01 fechou o contrato de banco e o adapter server-only da fase
compartilhável. A nova projeção passa por flags independentes, não abre tabelas
ao anônimo, omite IDs/PII e falha para o cartão atual quando encontra schema
N−1 ou capacidade desligada.

O checkpoint avançou para CP1 sem ativar nenhum time. A retomada começa em
WP-R08M-02, conectando o DTO já validado a metadata, HTML e `convite.png`, sem
remover o caminho atual enquanto o consumidor novo não provar compatibilidade.
