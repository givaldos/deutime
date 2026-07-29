---
release: R02
work_package: WP-R02-01
scope: public_event_manual_pilot
branch_or_commit: "codex/r02-public-event-pilot"
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
  - "Baseline anônima antes da ativação — 404"
  - "Smoke com flag ativa — 200, projeção mínima e headers de privacidade aprovados"
  - "Rollback pela RPC — flag false e 404 aprovados"
  - "Restauração do piloto — 200 e exatamente um public_event_page ativo"
  - "Runtime controls — 0 ativos"
  - "Auditoria preservada — 18 entradas por expansão repetida do retorno composto; prevenção adicionada ao backlog"
blocker: null
next_action: "Abrir o CP0 de WP-R02-02 e fechar o contrato mínimo de capability e sessão persistente antes de implementar escrita ou RSVP."
---

# Trabalho atual

O CP5 de `WP-R02-01` concluiu o piloto manual da página pública em produção.
`Demo Campo` é a única coorte com `public_event_page=true`; o evento
`Copa do Mundo` responde em
`/e/fdf577af-5cc4-489f-81cb-65fac548167b`.

O rollback foi exercitado e restaurado, os controles globais seguem desligados
e capability/RSVP não foram ativados. A próxima fatia é `WP-R02-02`, começando
por CP0 antes de qualquer implementação.
