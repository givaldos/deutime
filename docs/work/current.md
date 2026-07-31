---
release: R03
work_package: WP-R03-01
scope: whatsapp_enqueue_claim_database
branch_or_commit: "918bc51"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
  - "AC-R03-02"
  - "AC-R03-03"
  - "AC-R03-04"
dirty_files:
  - "supabase/migrations/202607310001_whatsapp_dispatch_contract.sql"
  - "supabase/tests/023_whatsapp_dispatch_contract.test.sql"
  - "lib/database.types.ts"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/releases/README.md"
  - "docs/work/current.md"
tests:
  - "npm run db:reset — schema recomposto e seed concluído"
  - "npm run db:test — 23 arquivos e 570 testes aprovados"
  - "npm run db:lint — nenhum alerta novo; aviso legado em create_event_as_staff"
  - "npm run verify — lint, typecheck e 158 testes aprovados; build aprovado com rede"
blocker: null
next_action: "Implementar WP-R03-02 com adapter provider-neutral e worker em dry-run, sem habilitar whatsapp_delivery, integration_produce ou integration_consume."
---

# Trabalho atual

`WP-R03-01` está implementado como expansão forward-only e inerte. A outbox
possui versão da intenção, lease, barreira de efeito, classe de falha e revisão
manual. Tentativas e eventos normalizados nasceram com RLS e sem grants diretos
ao cliente.

As RPCs cobrem enqueue administrativo, claim concorrente, preparo que emite o
segredo uma única vez, ack, nack, callback idempotente e recuperação de lease.
Somente o hash da credencial e do token de callback é persistido. Resultado
ambíguo depois da barreira nunca volta ao claim automático.

O pgTAP validou dedupe, elegibilidade, opt-out entre enqueue/preparo,
cross-tenant, replay, callback fora de ordem, rejeição transitória e recuperação
antes/depois do efeito. A aplicação compilou contra os tipos regenerados.

Nenhum efeito externo foi executado. `whatsapp_delivery`,
`integration_produce` e `integration_consume` continuam desligados. A próxima
fatia é o adapter provider-neutral e o worker em dry-run.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
