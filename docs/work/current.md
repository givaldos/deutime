---
release: R02
work_package: WP-R02-03
scope: capability_rsvp_ui
branch_or_commit: "codex/r02-rsvp-experience"
checkpoint: CP5
status: operational_probe_ready_for_deploy
completed_ac: []
dirty_files:
  - "docs/releases/R02-confirmacao-pelo-link.md"
  - "lib/database.types.ts"
  - "package.json"
  - "scripts/rsvp-pilot-health.d.mts"
  - "scripts/rsvp-pilot-health.mjs"
  - "scripts/rsvp-pilot-health.test.ts"
  - "supabase/migrations/202607300001_event_capability_pilot_health.sql"
  - "supabase/tests/022_event_capability_pilot_health.test.sql"
  - "docs/work/current.md"
tests:
  - "Vitest focado — contratos, DAL, Action, componente e rota pública aprovados"
  - "npm run db:reset — 30 migrations e seed aplicados"
  - "npm run db:test — 21 arquivos/494 testes pgTAP aprovados"
  - "npm run db:lint — nenhum aviso novo"
  - "npm run db:types — sem diferença"
  - "npm run migrations:check -- 64a8bc0 — aprovado"
  - "teste físico local 390x844 — Confirmado → Não vou → Talvez e fallback com flag desligada"
  - "npm run verify — lint, typecheck, 24 arquivos/144 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "CP3 focado — 4 arquivos/37 testes de revogação, expiração, fechamento, concorrência, encaminhamento, acessibilidade e logs"
  - "npm run verify — lint, typecheck, 24 arquivos/151 testes Vitest e build aprovados"
  - "produção anônima — evento Demo Campo acessível, fallback público correto e nenhum controle RSVP exposto com gates desligados"
  - "produção com capability — fragmento removido, SIM/NÃO/TALVEZ persistidos, reload limpo e alvos de 56 px"
  - "produção com revogação — acesso removido imediatamente e recuperado por nova credencial em aparelho novo"
  - "metadata/logs — canonical e OG limpos, sem credencial nos logs capturados"
  - "APP_URL=https://deutime.app npm run smoke:production — aprovado"
  - "sonda operacional — Vitest focado, 4 testes aprovados"
  - "npm run db:reset — 31 migrations e seed aplicados"
  - "npm run db:test — 22 arquivos/510 testes pgTAP aprovados"
  - "npm run db:lint — somente dois avisos preexistentes"
  - "npm run db:types — somente a nova RPC agregada"
  - "npm run migrations:check -- e23767a — aprovado"
  - "npm run verify — lint, typecheck, 25 arquivos/155 testes e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
blocker: null
next_action: "Integrar a sonda operacional, executar contra a coorte Demo Campo em produção e exercitar o rollback/rearme do gate RSVP; a validação física de CP4 continua pendente."
---

# Trabalho atual

O CP4 de `WP-R02-03` ativou o piloto somente para `Demo Campo`, usando o controle
global e as flags do time pelas RPCs auditadas. O link reconheceu Neymar, removeu
o fragmento, persistiu SIM/NÃO/TALVEZ e manteve a última resposta após reload
sem segredo.

A credencial inicial foi revogada e o aparelho caiu imediatamente no fallback
público. Uma nova credencial recuperou o acesso e está copiada para o teste
físico. Falta o operador confirmar Android, iPhone, navegador interno do
WhatsApp e navegador padrão antes de encerrar o CP4.

Enquanto essa evidência física aguarda, o CP5 ganhou uma sonda operacional
agregada, exclusiva de `service_role`, e um comando fail-closed para observar
gates, capabilities, revogações e RSVPs sem PII ou segredos. A alteração local
do usuário em `docs/roadmap.md` permanece separada.
