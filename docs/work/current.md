---
release: R01
work_package: WP-R01-02
scope: event_control
branch_or_commit: "codex/r01-event-cancellation"
checkpoint: CP3
status: complete
completed_ac:
  - "AC-R01-01"
  - "AC-R01-02"
  - "AC-R01-03"
  - "AC-R01-05"
  - "AC-R01-06"
  - "AC-R01-07"
dirty_files:
  - "app/app/[teamSlug]/events/[eventId]/page.tsx"
  - "app/app/[teamSlug]/events/actions.ts"
  - "app/me/agenda/[eventId]/page.tsx"
  - "components/event-cancel-form.tsx"
  - "docs/releases/R01-evento-sob-controle.md"
  - "docs/work/current.md"
  - "lib/database.types.ts"
  - "lib/validation/operations.test.ts"
  - "lib/validation/operations.ts"
  - "supabase/migrations/202607280001_event_cancellation.sql"
  - "supabase/tests/015_event_cancellation.test.sql"
tests:
  - "npx supabase db reset — migrations e seed aplicados"
  - "npm run db:test — 15 arquivos, 331 testes"
  - "npm run db:lint — sem regressão; aviso legado em create_event_as_staff"
  - "npm run verify — lint, typecheck e 12 arquivos/73 testes"
  - "npm run build — ok com rede para Google Fonts"
  - "npm run security:audit — 0 vulnerabilidades"
  - "viewport 390x844 — fluxo completo, sem overflow e ação principal de 48 px"
blocker: null
next_action: "Revisar e integrar WP-R01-02; depois iniciar WP-R01-03 com extensão idempotente e cancelamento de série."
---

# Trabalho atual

WP-R01-02 concluiu o caminho robusto do CP3. O cancelamento é soft,
transacional e idempotente, preserva fatos históricos e publica mudanças
explícitas para integrações futuras. A capacidade continua desligada por
padrão. O próximo pacote implementa extensão idempotente e fecha os cenários
restantes de série.
