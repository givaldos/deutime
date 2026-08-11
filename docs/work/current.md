---
release: R07
work_package: WP-R07-06
scope: persistent_internal_squads_badges_progressive_ux
branch_or_commit: "aff99ce"
checkpoint: CP5
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
  - AC-R07-08
  - AC-R07-09
  - AC-R07-11
  - AC-R07-12
  - AC-R07-13
  - AC-R07-14
dirty_files: []
tests:
  - "Vitest completo: 57 arquivos, 318 testes verdes"
  - "db:reset, db:types e db:test: verdes; 42 arquivos, 1.014 testes pgTAP"
  - "integridade de migrations origin/main..HEAD: verde"
  - "ensaio mobile 390x844: equipes internas, 14x14, mover por toque, salvar e alternar para publicar"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "npm audit --audit-level=moderate: 0 vulnerabilidades"
  - "PR #162 e merge aff99ce: checks obrigatórios verdes"
  - "Deploy database 31542818301 e Smoke 31542863602: verdes"
  - "Vercel produção 8y3nfqLj8W6ipw6hXFjYcGGYaVVn: concluído"
blocker: null
next_action: "Validar em Android e iPhone: equipes automáticas, troca por toque, salvar e publicar."
---

# Trabalho atual

Equipes internas persistentes, catálogo fechado de escudos SVG e vínculo
histórico com `event_squads` estão implementados. A gestão fica em Configurações
e o evento abre com divisão automática, troca por toque e uma única ação fixa:
salvar; após sucesso, publicar.

A implementação passou pelos gates completos, foi promovida por PR e está em
produção após migration, Vercel e smoke verdes. A próxima ação concreta é a
validação física da jornada em Android e iPhone.
