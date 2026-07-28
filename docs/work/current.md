---
release: R01
work_package: WP-R01-03
scope: event_control
branch_or_commit: "codex/r01-series-extension"
checkpoint: CP4
status: complete
completed_ac:
  - "AC-R01-01"
  - "AC-R01-02"
  - "AC-R01-03"
  - "AC-R01-04"
  - "AC-R01-05"
  - "AC-R01-06"
  - "AC-R01-07"
dirty_files:
  - "app/app/[teamSlug]/events/[eventId]/page.tsx"
  - "app/app/[teamSlug]/events/actions.ts"
  - "components/event-series-extension-form.tsx"
  - "docs/releases/R01-evento-sob-controle.md"
  - "docs/work/current.md"
  - "lib/database.types.ts"
  - "lib/validation/operations.test.ts"
  - "lib/validation/operations.ts"
  - "supabase/migrations/202607280002_series_extension.sql"
  - "supabase/tests/016_event_series_extension.test.sql"
tests:
  - "npx supabase db reset — migrations e seed aplicados"
  - "npm run db:test — 16 arquivos, 359 testes"
  - "npm run db:lint — sem regressão; aviso legado em create_event_as_staff"
  - "npm run verify — lint, typecheck, 12 arquivos/74 testes e build"
  - "npm run security:audit — 0 vulnerabilidades"
  - "viewport 390x844 — série de 3 para 5, sem overflow e controles de 48 px"
blocker: null
next_action: "Revisar e integrar WP-R01-03; depois executar o CP5 com deploy inerte, smoke e piloto controlado em um único time."
---

# Trabalho atual

WP-R01-03 concluiu a experiência do CP4 e todos os critérios funcionais da R01.
Criação, edição, cancelamento e extensão usam comandos idempotentes, horário
civil autoritativo e mudanças explícitas para integrações futuras. A capacidade
continua desligada por padrão. O próximo passo é o CP5: deploy inerte, smoke e
piloto controlado em um único time, sem liberar a capacidade globalmente.
