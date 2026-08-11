---
release: R07
work_package: WP-R07-05
scope: reusable_squads_auto_split_touch_ux
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
dirty_files:
  - supabase/migrations/202608110005_r07_reusable_squad_presets.sql
  - supabase/tests/041_r07_reusable_squad_presets.test.sql
  - lib/features/team-division/automatic.ts
  - lib/features/team-division/automatic.test.ts
  - components/event-lineup-editor.tsx
  - components/event-lineup-editor.test.tsx
  - app/app/[teamSlug]/events/[eventId]/page.tsx
  - app/app/[teamSlug]/events/lineup-actions.ts
  - app/app/[teamSlug]/events/lineup-actions.test.ts
  - lib/validation/team-division.ts
  - lib/database.types.ts
tests:
  - "algoritmo, interface e Action focados: 3 arquivos, 15 testes verdes"
  - "Vitest completo: 55 arquivos, 316 testes verdes"
  - "db:reset, db:types e db:test: verdes; 41 arquivos, 998 testes pgTAP"
  - "ensaio mobile 390x844: 14x14, mover, retirar/recolocar, salvar e recarregar"
  - "db:lint: verde; somente avisos legados em create_event_as_staff e record_match_event"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "npm audit --audit-level=moderate: 0 vulnerabilidades"
blocker: null
next_action: "Abrir PR dev -> main, acompanhar deploy e repetir a jornada por toque em Android/iPhone na coorte demo."
---

# Trabalho atual

O pacote consolidado está implementado e validado localmente. O `select`
individual permanece recolhido como fallback acessível; o caminho primário é a
sugestão automática ajustável por cartões de toque.

Owner/admin salva times padrão de nome/cor/ordem. Evento novo copia o modelo,
cria IDs próprios e distribui confirmados de modo reproduzível, priorizando a
separação de goleiros e diferença máxima de uma pessoa. Nada persiste antes do
salvar explícito.

A próxima ação é promover expansion e consumidor no mesmo PR, executar smoke e
validar a interface nova em Android/iPhone na coorte demo. Até a migration ser
aplicada, a leitura de times padrão falha fechada sem derrubar o editor anterior.
