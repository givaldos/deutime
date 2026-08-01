---
release: R03
work_package: WP-R03-04
scope: whatsapp_template_contract_sandbox_readiness
branch_or_commit: "codex/r03-whatsapp-template-contract"
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
  - "lib/features/delivery/dispatch-contract.ts"
  - "lib/features/delivery/dispatch-contract.test.ts"
  - "lib/features/delivery/twilio-adapter.ts"
  - "lib/features/delivery/twilio-adapter.test.ts"
  - "lib/features/delivery/whatsapp-template-catalog.ts"
  - "lib/features/delivery/whatsapp-template-catalog.test.ts"
  - "lib/features/delivery/twilio-pilot-config.ts"
  - "lib/features/delivery/twilio-pilot-config.test.ts"
  - "supabase/migrations/202608010002_whatsapp_template_context.sql"
  - "supabase/tests/026_whatsapp_template_context.test.sql"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/releases/README.md"
  - "docs/architecture.md"
  - "docs/runbook.md"
  - "docs/work/current.md"
tests:
  - "19 testes focados — catálogo, minimização, perfis, fuso, adapter e configuração"
  - "npm run db:reset — schema recomposto com a migration 202608010002"
  - "npm run db:test — 26 arquivos e 599 testes aprovados"
  - "npm run db:lint — nenhum alerta novo; aviso legado em create_event_as_staff"
  - "npm run verify — lint, typecheck e 197 testes aprovados; build aprovado com rede"
blocker: null
next_action: "Configurar credenciais server-only e Content SID pré-aprovado; implementar entrypoint live limitado a uma única intenção Demo Campo e executar prova Sandbox acompanhada."
---

# Trabalho atual

`WP-R03-04` possui agora um contrato explícito para o template definitivo e um
preset separado para a limitação do Sandbox. O horário é renderizado no fuso
autoritativo persistido junto da intenção, sem acrescentar PII.

O Sandbox não aprova conteúdo customizado. A prova física usará o Appointment
Reminders pré-aprovado, enquanto `event_call:v1` só será submetido quando houver
sender próprio. Portanto `AC-R03-06` e `AC-R03-09` continuam abertos.

Nenhum efeito externo foi executado. O parser de configuração não é consumido
por entrypoint live, `WHATSAPP_PILOT_MODE` nasce `off` e flags/controles não
foram alterados.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
