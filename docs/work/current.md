---
release: R03
work_package: WP-R03-02
scope: whatsapp_adapter_worker_dry_run
branch_or_commit: "a40cceb"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
  - "AC-R03-02"
  - "AC-R03-03"
  - "AC-R03-04"
  - "AC-R03-07"
dirty_files:
  - ".env.example"
  - "app/api/internal/whatsapp/worker/route.ts"
  - "app/api/internal/whatsapp/worker/route.test.ts"
  - "lib/features/delivery/dispatch-contract.ts"
  - "lib/features/delivery/dispatch-contract.test.ts"
  - "lib/features/delivery/twilio-adapter.ts"
  - "lib/features/delivery/twilio-adapter.test.ts"
  - "lib/features/delivery/whatsapp-worker.ts"
  - "lib/features/delivery/whatsapp-worker.test.ts"
  - "lib/features/delivery/worker-auth.ts"
  - "lib/features/delivery/worker-auth.test.ts"
  - "lib/features/delivery/supabase-delivery-repository.ts"
  - "supabase/migrations/202607310002_whatsapp_worker_dry_run.sql"
  - "supabase/tests/024_whatsapp_worker_dry_run.test.sql"
  - "lib/database.types.ts"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/architecture.md"
  - "docs/security.md"
  - "docs/work/current.md"
tests:
  - "23 testes focados — contrato, Twilio, worker, autenticação e Route Handler"
  - "npm run db:reset — schema recomposto com a migration 002"
  - "npm run db:test — 24 arquivos e 580 testes aprovados"
  - "npm run db:lint — nenhum alerta novo; aviso legado em create_event_as_staff"
  - "npm run verify — lint, typecheck e 176 testes aprovados; build aprovado com rede"
blocker: null
next_action: "Implementar WP-R03-03: callback X-Twilio-Signature, endpoint de status e operação redigida; manter o executor sem modo live."
---

# Trabalho atual

`WP-R03-02` entrega o caminho fino do worker sem efeito externo. O executor
interno exige bearer forte, falha fechado com `integration_consume` desligado e
está fixo em dry-run. Nesse modo, usa o claim real e o libera antes da barreira,
sem preparar credencial e sem chamar adapter.

O worker provider-neutral já coordena prepare/ack/nack para testes do caminho
live, mas nenhum entrypoint o expõe. O adapter Twilio usa Content API, callback
por token opaco e classificação segura de resposta; nenhuma variável Twilio é
lida nesta fatia.

A RPC `release_notification_claim` restaura estado e tentativas apenas antes de
`effect_started_at`. Depois da barreira ela falha, preservando a recuperação
manual definida no ADR.

Nenhum efeito externo foi executado. `whatsapp_delivery`,
`integration_produce` e `integration_consume` continuam desligados. A próxima
fatia é callback assinado e operação redigida; o modo live permanece fechado.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
