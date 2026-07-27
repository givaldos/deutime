---
release: R00
work_package: WP-R00-04
scope: feature_delivery
branch_or_commit: "8328337"
checkpoint: CP5
status: awaiting_external_validation
completed_ac:
  - AC-R00-01
  - AC-R00-02
  - AC-R00-03
  - AC-R00-04
  - AC-R00-05
  - AC-R00-07
  - AC-R00-08
  - AC-R00-09
  - AC-R00-10
  - AC-R00-11
dirty_files:
  - ".github/workflows/terraform.yml"
  - "docs/work/current.md"
  - "docs/runbook.md"
  - "infra/terraform/README.md"
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
  - "supabase db push --dry-run — produção sem migrations pendentes"
  - "Deploy database — workflow de produção concluído"
  - "Smoke — workflow de produção concluído"
  - "rollback para 2cd8589 e restauração de 10cbe0e — smoke read-only concluído nas duas versões"
  - "terraform fmt -check -recursive"
  - "terraform validate"
  - "npm run security:audit — 0 vulnerabilidades"
blocker: "AC-R00-13 depende dos Environments production-plan/production-apply e das credenciais do HCP Terraform; staging foi explicitamente adiado para depois do MVP."
next_action: "Publicar o mapeamento completo de inputs, configurar o workspace HCP em modo Local e preencher production-plan/production-apply antes do primeiro plano."
---

# Trabalho atual

A fundação está em CP5 com banco, smoke, compatibilidade N/N−1 e rollback
validados em produção. Falta o plano/aplicação protegidos de `AC-R00-13`.
Staging foi adiado para acelerar o MVP; por isso `AC-R00-06` e `AC-R00-12`
permanecem dívida explícita. Não habilitar flags, kill switches nem
`ENABLE_TERRAFORM_APPLY` antes de configurar e revisar os Environments.
