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
  - "npm run db:test — 287 testes"
  - "npm run smoke:production — build local"
  - "terraform fmt -check -recursive"
  - "terraform validate"
  - "npm run security:audit — 0 vulnerabilidades"
blocker: "CP5 depende dos gates reais de produção; staging foi explicitamente adiado para depois do MVP."
next_action: "Validar e publicar a expansão inerte em main, confirmar o histórico remoto, executar smoke read-only em https://deutime.app e ensaiar rollback pela Vercel."
---

# Trabalho atual

O código da fundação está validado localmente até CP4. A release permanece em
CP5 porque matriz N/N−1, plano/aplicação protegidos e rollback precisam de
evidência em produção. Staging foi adiado para acelerar o MVP; por isso
`AC-R00-06` e `AC-R00-12` permanecem dívida explícita. Não habilitar flags,
kill switches nem `ENABLE_TERRAFORM_APPLY` antes do ensaio produtivo.
