---
release: R07
work_package: WP-R07-04
scope: lineup_pilot_and_completion
branch_or_commit: "dev"
checkpoint: CP5
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
  - "PR #158 e merge 3ab53a8: todos os checks verdes"
  - "Deploy database 31489279371 e Smoke 31489276737: verdes"
  - "produção demo-campo: off/on, fallback real e reativação confirmados"
blocker: null
next_action: "Publicar uma divisão demo pela interface e validar URL/imagem em Android e iPhone; então concluir AC-R07-10 e R07."
---

# Trabalho atual

O CP5 da R07 está ativo somente em `demo-campo`. Deploy do banco, Vercel, smoke
e checks passaram; a sonda agregada confirmou ambos os gates sem rascunhos ou
revisões criados automaticamente.

O rollback produtivo foi exercitado: desligar `team_division` removeu o editor
imediatamente, preservando o link público e a chamada; religar restaurou o
editor sem alterar o domínio.

A próxima ação é publicar uma divisão no evento demo pela própria interface e
validar a URL e a imagem em Android e iPhone. Só então `AC-R07-10` e a release
podem ser concluídos.
