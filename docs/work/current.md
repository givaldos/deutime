---
release: R13
work_package: WP-R13-06
scope: global_product_rollout
branch_or_commit: "codex/r13-global-rollout"
checkpoint: CP5
status: active
completed_ac:
  - "catálogo global evoluído de 15 para 16 capacidades"
  - "configuração mínima idempotente para times atuais e futuros"
  - "seis controles operacionais cobertos pelo rollout e rollback"
  - "RLS, grants, auditoria, isolamento e preservação de dados validados"
dirty_files:
  - "docs/work/current.md"
  - "supabase/migrations/202609040001_r13_global_product_rollout.sql"
  - "supabase/tests/057_enable_all_product_features.test.sql"
  - "supabase/tests/063_r12_pilot_health.test.sql"
  - "supabase/tests/064_r13_professional_scheduling_feature.test.sql"
  - "supabase/tests/069_r13_global_product_rollout.test.sql"
tests:
  - "PASS: npm run db:reset"
  - "PASS: npm run db:lint (somente 2 avisos legados)"
  - "PASS: npm run db:test (69 arquivos, 1802 testes)"
  - "PASS: npm test (123 arquivos, 600 testes)"
  - "PASS: npm run lint"
  - "PASS: npm run typecheck"
  - "PASS: npm run test:context"
  - "PASS: npm run migrations:check -- origin/dev HEAD"
  - "PASS: npm run security:audit (0 vulnerabilidades)"
  - "PASS: next build --webpack"
blocker: null
next_action: "Executar gates completos, promover branch → dev → main, aplicar migration, ativar, exercitar rollback/restauração, executar smoke e fechar CP6."
---

# Trabalho atual

O rollout global da R13 adiciona `professional_scheduling` ao catálogo
validado. A migration é inerte no deploy: a mudança de estado ocorre somente
pela RPC transacional de `service_role`.

Times sem equipes internas recebem apenas os padrões neutros e editáveis
`Time A` e `Time B`; configurações existentes não são sobrescritas. O kill
switch desliga flags e controles sem apagar equipes, eventos, confirmações,
confrontos, decisões ou outbox, permitindo restauração idempotente.
