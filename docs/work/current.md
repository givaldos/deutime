---
release: R02
work_package: WP-R02-03
scope: capability_rsvp_contract
branch_or_commit: "codex/r02-rsvp-contract"
checkpoint: idle
status: contract_complete
completed_ac: []
dirty_files: []
tests:
  - "npm run verify — lint, typecheck, 21 arquivos/124 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "npm run db:reset — 30 migrations e seed aplicados"
  - "npm run db:test — 21 arquivos/494 testes pgTAP aprovados; 38 novos"
  - "npm run db:lint — nenhum aviso novo"
  - "npm run db:types — respond_to_event_from_access refletida"
  - "npm run migrations:check -- 50a6a08 — histórico preservado"
blocker: null
next_action: "Executar CP2 de WP-R02-03: criar Server Action estreita e controles mobile SIM/NÃO/TALVEZ na página reconhecida, com fallback de leitura para banco N−1 e event_capability_rsvp desligada."
---

# Trabalho atual

O CP1 de `WP-R02-03` publicou localmente a expansão forward-only da RPC
transacional de resposta. Capability tem precedência sobre a sessão verificada,
todos os IDs internos são derivados no banco e link encaminhado não recebe
atribuição falsa em `responded_by` ou auditoria.

O checkpoint está ocioso e pronto para CP2. Os 494 testes pgTAP passaram e
`event_capability_rsvp` continua desligada; app N−1 ignora a expansão e o
consumidor N deverá manter a página somente leitura diante de banco N−1.
