---
release: R09
work_package: WP-R09-04
scope: public_championship_projection
branch_or_commit: "codex/r09-grupos-mata-mata"
checkpoint: CP2
status: ready
completed_ac: [AC-R09-01, AC-R09-03, AC-R09-06, AC-R09-07, AC-R09-08, AC-R09-09]
dirty_files: []
tests:
  - "pgTAP focado WP-R09-03: 63/63 assertions aprovadas"
  - "db:reset limpo; db:test: 47 arquivos e 1.218 testes aprovados"
  - "db:lint: nenhum aviso novo; dois avisos legados permanecem fora do escopo"
  - "migrations forward-only, schema reaplicado e tipos regenerados"
  - "gate de app: ESLint, TypeScript e 67 arquivos/391 testes Vitest aprovados"
  - "build de produção Webpack aprovado; auditoria: zero vulnerabilidades"
  - "jornada no navegador aprovada; evidências iPhone e Android revisadas pelo responsável; fallback reativado"
blocker: null
next_action: "Implementar WP-R09-04 com projeção anônima mínima, rota /c/{public_id} e compartilhamento seguro, mantendo championships desligada."
---

# Trabalho atual

WP-R09-03 concluiu grupos e mata-mata atrás da flag `championships`. Owner/admin
gera grupos ou chave direta, decide vagas absolutamente empatadas com motivo,
avança classificados e resolve empate eliminatório, W.O. ou decisão
administrativa sem inventar placar.

Byes e dependências são estruturais e idempotentes. Correções propagam apenas
antes do confronto dependente começar; remarcação e retirada preservam o
histórico concluído e falham fechadas diante de fatos já iniciados.

O checkpoint permanece em CP2 sem ativar organização. A retomada começa em
`WP-R09-04`, com projeção pública mínima e compartilhamento seguro. Piloto,
telemetria e rollout continuam fora até o pacote seguinte.
