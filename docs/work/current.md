---
release: R09
work_package: WP-R09-03
scope: groups_knockout_happy_path
branch_or_commit: "dev"
checkpoint: CP2
status: ready
completed_ac: []
dirty_files: []
tests:
  - "pgTAP focado WP-R09-02: 31/31 assertions aprovadas"
  - "db:reset limpo; db:test: 46 arquivos e 1.155 testes aprovados"
  - "db:lint: nenhum aviso novo; dois avisos legados permanecem fora do escopo"
  - "migrations: somente expansões R09 novas; tipos regenerados a partir do schema final"
  - "gate de app: ESLint, TypeScript e 67 arquivos/381 testes Vitest aprovados"
  - "build Webpack aprovado; Turbopack local limitado pelo bind de porta do ambiente"
  - "jornada mobile 390x844 e 360x800: criação, participantes, geração, publicação, vínculo e fallback aprovados"
blocker: null
next_action: "Implementar WP-R09-03 com grupos, classificados, mata-mata, byes e decisão eliminatória explícita sobre o contrato R09 existente, mantendo championships desligada."
---

# Trabalho atual

WP-R09-02 concluiu o caminho fino mobile de pontos corridos atrás da flag
`championships`. Owner/admin cria regulamento e participantes, gera uma grade
round-robin revisável e publica por RPC idempotente; manager também pode vincular
confrontos publicados a partidas ainda sem fatos.

A classificação é reconstruída em cada leitura exclusivamente a partir da súmula
de partidas finalizadas. Anulação remove o resultado da projeção, empate absoluto
compartilha posição e nenhuma tabela de contadores esportivos foi criada.

O checkpoint avançou para CP2 sem ativar organização. A retomada começa em
`WP-R09-03`, acrescentando grupos e mata-mata no mesmo domínio. Página pública,
compartilhamento e piloto continuam fora até os pacotes seguintes.
