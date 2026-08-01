---
release: R03
work_package: WP-R03-03
scope: whatsapp_callback_operation
branch_or_commit: "codex/r03-whatsapp-callback-operation"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
  - "AC-R03-02"
  - "AC-R03-03"
  - "AC-R03-04"
  - "AC-R03-05"
  - "AC-R03-07"
  - "AC-R03-08"
dirty_files:
  - ".env.example"
  - "package.json"
  - "package-lock.json"
  - "app/api/integrations/twilio/whatsapp/status/route.ts"
  - "app/api/integrations/twilio/whatsapp/status/route.test.ts"
  - "lib/features/delivery/twilio-status-callback.ts"
  - "lib/features/delivery/twilio-status-callback.test.ts"
  - "lib/features/delivery/supabase-delivery-repository.ts"
  - "supabase/migrations/202608010001_whatsapp_callback_operation.sql"
  - "supabase/tests/025_whatsapp_callback_operation.test.sql"
  - "lib/database.types.ts"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/releases/README.md"
  - "docs/architecture.md"
  - "docs/security.md"
  - "docs/work/current.md"
tests:
  - "10 testes focados — assinatura oficial, URL canônica, normalização, Route Handler e limites"
  - "npm run db:reset — schema recomposto com a migration 202608010001"
  - "npm run db:test — 25 arquivos e 592 testes aprovados"
  - "npm run db:lint — nenhum alerta novo; aviso legado em create_event_as_staff"
  - "npm run verify — lint, typecheck e 186 testes aprovados; build aprovado com rede"
blocker: null
next_action: "Implementar WP-R03-04: contrato do template mínimo, aprovação e prova Sandbox somente com participantes demo; manter o modo live fechado até os gates de piloto."
---

# Trabalho atual

`WP-R03-03` fecha a entrada de callbacks e a leitura operacional da R03. O
webhook valida assinatura com o SDK oficial, a URL canônica e todos os campos
recebidos antes de extrair a carga mínima. A RPC continua sendo a única escrita
e garante token opaco, SID vinculado, replay e ordem monotônica.

Owner/admin pode consultar uma projeção do próprio time com estados e falhas
sanitizadas. Telefone, corpo, URL personalizada, SID e credenciais não fazem
parte do retorno.

Nenhum efeito externo foi executado. `whatsapp_delivery`,
`integration_produce` e `integration_consume` continuam desligados, não há
entrypoint live e nenhuma credencial Twilio foi configurada nesta fatia.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
