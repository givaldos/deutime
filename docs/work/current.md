---
release: R03
work_package: WP-R03-04
scope: whatsapp_single_sandbox_pilot
branch_or_commit: "codex/r03-whatsapp-sandbox-pilot"
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
  - "app/api/internal/whatsapp/pilot/route.ts"
  - "app/api/internal/whatsapp/pilot/route.test.ts"
  - "lib/features/delivery/twilio-pilot-config.ts"
  - "lib/features/delivery/twilio-pilot-config.test.ts"
  - "lib/features/delivery/supabase-delivery-repository.ts"
  - "supabase/migrations/202608010003_whatsapp_single_sandbox_claim.sql"
  - "supabase/tests/027_whatsapp_single_sandbox_claim.test.sql"
  - "lib/database.types.ts"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/releases/README.md"
  - "docs/architecture.md"
  - "docs/security.md"
  - "docs/runbook.md"
  - "docs/work/current.md"
tests:
  - "21 testes focados — configuração, autorização, corpo, lote unitário, adapter e worker"
  - "npm run db:reset — schema recomposto com a migration 202608010003"
  - "npm run db:test — 27 arquivos e 610 testes aprovados"
  - "npm run db:lint — nenhum alerta novo; aviso legado em create_event_as_staff"
  - "lint, typecheck e 203 testes Vitest aprovados"
blocker: null
next_action: "Publicar a expansão inerte; configurar segredos na Vercel; selecionar exatamente uma intenção Demo Campo e executar a prova Sandbox acompanhada."
---

# Trabalho atual

`WP-R03-04` possui um executor live específico para o Sandbox, limitado por
bearer, ambiente, outbox, time, telefone, template, flag e kill switch. Ele não
varre a fila e não recupera leases globais.

O código e o banco estão validados, mas nenhuma credencial foi configurada e
nenhum efeito real foi executado. `AC-R03-06` aguarda aprovação do template
definitivo; `AC-R03-09` aguarda Android/iPhone e o sender próprio continua gate
para atletas reais.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
