---
release: R09
work_package: WP-R09-05
scope: championship_robustness_and_pilot
branch_or_commit: "codex/r09-pagina-publica"
checkpoint: CP2
status: ready
completed_ac: [AC-R09-01, AC-R09-03, AC-R09-06, AC-R09-07, AC-R09-08, AC-R09-09, AC-R09-10, AC-R09-12]
dirty_files: []
tests:
  - "pgTAP focado WP-R09-04: 41/41 assertions aprovadas"
  - "db:test: 48 arquivos e 1.259 testes aprovados"
  - "db:lint: nenhum aviso novo; dois avisos legados permanecem fora do escopo"
  - "migrations forward-only preservadas e tipos regenerados"
  - "gate de app: ESLint, TypeScript e 70 arquivos/404 testes Vitest aprovados"
  - "build de produção Webpack aprovado; auditoria: zero vulnerabilidades"
  - "rota /c aprovada em 390x844 e 360x800; headers privados aprovados; cenário local removido e fallback preservado"
blocker: null
next_action: "Executar WP-R09-05 com robustez, telemetria, runbook e piloto controlado CP3-CP6, incluindo Android, iPhone e navegador interno do WhatsApp."
---

# Trabalho atual

WP-R09-04 concluiu a projeção anônima mínima e a página `/c/{public_id}` atrás da
flag `championships`. Owner/admin publica ou recolhe o endereço por intenção
idempotente; sessões autenticadas não ampliam a audiência.

Regulamento, identidades visuais, tabela e chave continuam derivados do contrato
do campeonato. Placar e link da partida aparecem somente após autorização
pública já existente; atletas, endereço, IDs internos e motivos não entram na
projeção. Schema N−1, flag desligada ou falha retornam o mesmo estado não público.

O checkpoint permanece em CP2 sem ativar organização. A retomada começa em
`WP-R09-05`, com robustez, telemetria, runbook e piloto controlado. A evidência
física em Android, iPhone e navegador interno do WhatsApp integra esse gate.
