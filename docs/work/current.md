---
release: R07
work_package: WP-R07-06
scope: persistent_internal_squads_badges_progressive_ux
branch_or_commit: "dev"
checkpoint: CP4
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
blocker: null
next_action: "Promover dev por PR para main e executar rollout compatível do banco antes do consumidor."
---

# Trabalho atual

Equipes internas persistentes, catálogo fechado de escudos SVG e vínculo
histórico com `event_squads` estão implementados. A gestão fica em Configurações
e o evento abre com divisão automática, troca por toque e uma única ação fixa:
salvar; após sucesso, publicar.

A implementação passou pelos gates completos e pelo ensaio mobile local. A
próxima ação concreta é a promoção `dev → PR → main`, seguida pelo deploy da
migration antes do consumidor e validação física em Android/iPhone.
