---
release: R09
work_package: WP-R09-02
scope: league_happy_path
branch_or_commit: "dev"
checkpoint: CP1
status: ready
completed_ac: []
dirty_files: []
tests:
  - "pgTAP focado R09: 44/44 assertions aprovadas"
  - "db:reset: reconstrução limpa; db:test: 45 arquivos e 1.124 testes aprovados"
  - "db:lint: nenhum aviso novo; dois avisos legados permanecem fora do escopo"
  - "db:types: contrato R09 regenerado; TypeScript aprovado"
  - "integridade de migrations: somente as duas expansões R09 foram adicionadas"
  - "gate geral: ESLint, TypeScript, 65 arquivos/368 testes Vitest e build Webpack aprovados"
  - "Turbopack local limitado por bind de porta do ambiente; npm audit com zero vulnerabilidades"
blocker: null
next_action: "Implementar WP-R09-02 com criação mobile, participantes, geração/publicação idempotente de pontos corridos, vínculo com partida e classificação derivada atrás da flag championships."
---

# Trabalho atual

WP-R09-01 concluiu o contrato de banco de campeonatos sem alterar a operação
atual. A flag `championships` permanece desligada para todos os times; agenda,
partidas, súmula e histórico continuam sendo o fallback.

Campeonatos, participantes, confrontos, slots e recibos idempotentes estão
isolados por `team_id`. Owner/admin cria regulamento e participantes; manager
pode vincular um confronto publicado a uma partida ainda sem fatos. Nenhuma
tabela nova foi aberta ao anônimo e `event_matches` não ganhou dependência.

O checkpoint avançou para CP1. A retomada começa em `WP-R09-02`, entregando o
caminho fino mobile de pontos corridos atrás da flag, sem iniciar grupos,
mata-mata, página pública ou piloto.
