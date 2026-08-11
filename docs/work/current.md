---
release: R07
work_package: WP-R07-03
scope: lineup_publication_and_share_image
branch_or_commit: "dev"
checkpoint: CP3
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-04
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
dirty_files:
  - app/app/[teamSlug]/events/[eventId]/page.tsx
  - app/app/[teamSlug]/events/lineup-actions.test.ts
  - app/app/[teamSlug]/events/lineup-actions.ts
  - components/event-lineup-editor.test.tsx
  - components/event-lineup-editor.tsx
  - lib/validation/team-division.test.ts
  - lib/validation/team-division.ts
tests:
  - "validação física 390x844: sem overflow; salvar, excluir e recarregar persistiram"
  - "flag desligada: editor ausente e lista de confirmados preservada"
  - "Vitest focado: 3 arquivos, 10 testes verdes"
  - "Vitest completo: 51 arquivos, 293 testes verdes"
  - "db:reset, db:types e db:test: verdes; 38 arquivos, 943 testes pgTAP"
  - "db:lint: verde; somente avisos legados em create_event_as_staff e record_match_event"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "Turbopack local impedido por bind interno do runner"
  - "npm audit --audit-level=moderate: 0 vulnerabilidades"
blocker: null
next_action: "Implementar WP-R07-03: publicação consentida, projeção pública e imagem compartilhável da revisão ativa, mantendo lista e link canônico como fallback."
---

# Trabalho atual

O CP2 da R07 está concluído. Staff já consegue dividir manualmente os atletas
confirmados entre 2 e 12 equipes, excluir ou recolocar pessoas e persistir o
rascunho por uma interface mobile-first que não depende de arrastar.

A interface valida e delega às RPCs transacionais, preserva separação entre
RSVP, escalação planejada e participação real e mantém a lista anterior como
fallback. `team_division` permanece fail-closed e desligada em produção.

A próxima ação é `WP-R07-03`: expor somente a revisão publicada e consentida na
página pública e produzir uma imagem compartilhável com branding, cache e
fallback para a lista e o link canônico do evento.
