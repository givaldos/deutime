---
release: R07
work_package: WP-R07-04
scope: lineup_pilot_and_completion
branch_or_commit: "dev"
checkpoint: CP4
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-04
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
  - AC-R07-08
  - AC-R07-09
dirty_files:
  - supabase/migrations/202608110004_r07_lineup_pilot_health.sql
  - supabase/tests/040_r07_lineup_pilot_health.test.sql
  - scripts/lineup-pilot-health.mjs
  - scripts/lineup-pilot-health.d.mts
  - scripts/lineup-pilot-health.test.ts
  - app/e/[publicId]/convite.png/route.tsx
  - app/e/[publicId]/convite.png/route.test.tsx
  - docs/runbook.md
  - lib/database.types.ts
  - package.json
tests:
  - "sonda e logs focados: 2 arquivos, 10 testes verdes"
  - "Vitest completo: 54 arquivos, 310 testes verdes"
  - "db:reset, db:types e db:test: verdes; 40 arquivos, 979 testes pgTAP"
  - "ensaio local: gates off -> on/on -> rollback off/on -> restauração off/off"
  - "db:lint: verde; somente avisos legados em create_event_as_staff e record_match_event"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "npm audit --audit-level=moderate: 0 vulnerabilidades"
blocker: null
next_action: "Promover WP-R07-04 inerte, executar smoke e ativar somente uma coorte demo para o piloto físico Android/iPhone."
---

# Trabalho atual

O CP4 local da R07 está validado. A sonda operacional restrita a `service_role`
retorna apenas métricas agregadas e a imagem produz logs redigidos sem IDs,
nomes, telefones ou conteúdo de exceção.

O ensaio local confirmou ativação e rollback imediato por flag, mantendo a
página pública e restaurando o estado inicial desligado. Banco, aplicação,
build e auditoria estão verdes.

A próxima ação é promover a expansão inerte, executar smoke de produção e
ativar uma única coorte demo. A release só termina após evidência física da
jornada R07 em Android e iPhone.
