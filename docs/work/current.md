---
release: R01
work_package: WP-R01-01
scope: event_control
branch_or_commit: "codex/r01-event-control-wp01"
checkpoint: CP2
status: complete
completed_ac:
  - "AC-R01-01"
  - "AC-R01-06"
  - "AC-R01-07"
dirty_files:
  - "app/app/[teamSlug]/events/[eventId]/edit/page.tsx"
  - "app/app/[teamSlug]/events/actions.ts"
  - "app/app/[teamSlug]/events/new/page.tsx"
  - "components/admin-event-form.tsx"
  - "docs/releases/R01-evento-sob-controle.md"
  - "docs/work/current.md"
  - "lib/database.types.ts"
  - "lib/features/delivery/capabilities.ts"
  - "lib/validation/operations.test.ts"
  - "lib/validation/operations.ts"
  - "supabase/migrations/202607270002_event_control_feature.sql"
  - "supabase/migrations/202607270003_event_control_contract.sql"
  - "supabase/tests/006_public_team_schedule.test.sql"
  - "supabase/tests/014_event_control.test.sql"
tests:
  - "npx supabase db reset — migrations e seed aplicados"
  - "npm run db:test — 14 arquivos, 306 testes"
  - "npm run db:lint — sem regressão; aviso legado em create_event_as_staff"
  - "npm run lint — ok"
  - "npm run typecheck — ok"
  - "npm test — 11 arquivos, 65 testes"
  - "npm run build — ok com rede para Google Fonts"
  - "viewport 390x844 — sem overflow, labels/descrições e teclado verificados"
blocker: null
next_action: "Revisar e integrar WP-R01-01; depois iniciar WP-R01-02 com cancelamento soft e remarcação completa."
---

# Trabalho atual

WP-R01-01 concluiu o caminho fino do CP2. A expansão permanece inerte até a
flag ser habilitada por time; criação e edição v2 usam horário civil
autoritativo, replay idempotente e mudanças versionadas. O fluxo legado segue
intacto com a capacidade desligada. O próximo pacote implementa cancelamento
soft e completa os efeitos transacionais de remarcação.
