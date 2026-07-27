---
release: R00
work_package: WP-R00-04
scope: feature_delivery
branch_or_commit: "working-tree"
checkpoint: CP5
status: awaiting_external_validation
completed_ac:
  - AC-R00-01
  - AC-R00-02
  - AC-R00-03
  - AC-R00-04
  - AC-R00-07
  - AC-R00-09
  - AC-R00-10
  - AC-R00-11
dirty_files:
  - "supabase/migrations/202607270001_delivery_foundation.sql"
  - "supabase/tests/013_delivery_foundation.test.sql"
  - "lib/features/delivery/"
  - "scripts/check-migration-integrity.mjs"
  - "scripts/smoke.mjs"
  - ".github/workflows/"
  - "docs/"
tests:
  - "npm ci — instalação limpa, 0 vulnerabilidades"
  - "npm run lint"
  - "npm run typecheck"
  - "npm test — 64 testes"
  - "npm run build"
  - "npm run db:reset"
  - "npm run db:lint — somente warnings preexistentes"
  - "npm run db:test — 293 testes"
  - "npm run smoke:production — build local"
  - "terraform fmt -check -recursive"
  - "terraform validate"
  - "npm run security:audit — 0 vulnerabilidades"
blocker: "CP5 depende da configuração e execução dos Environments reais de staging/produção."
next_action: "Configurar production-plan, production e staging com segredos isolados; executar matriz N/N−1, smoke sintético e ensaio de rollback; anexar IDs ao R00."
---

# Trabalho atual

O código da fundação está validado localmente até CP4. A release permanece em
CP5 porque smoke de staging, matriz N/N−1, plano/aplicação protegidos e rollback
precisam de evidência dos Environments reais. Não habilitar flags nem
`ENABLE_TERRAFORM_APPLY` antes desse ensaio.
