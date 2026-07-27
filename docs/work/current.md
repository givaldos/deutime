---
release: R00
work_package: WP-R00-04
scope: feature_delivery
branch_or_commit: "c522b9f"
checkpoint: idle
status: complete
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
dirty_files: []
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
deferred_ac:
  - AC-R00-06
  - AC-R00-12
  - AC-R00-13
blocker: null
next_action: "Iniciar o CP0 da R01; melhorias técnicas adiadas estão em docs/backlog.md, seção 7.3."
---

# Trabalho atual

R00 concluída para o escopo local + produção do MVP, com banco, smoke,
compatibilidade N/N−1 e rollback validados em produção. Terraform operacional,
staging e demais melhorias não bloqueadoras seguem no backlog técnico. A
próxima execução começa no CP0 da R01.
