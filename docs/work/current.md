---
release: R07
work_package: WP-R07-02
scope: manual_team_division_mobile
branch_or_commit: "dev"
checkpoint: CP2
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
dirty_files:
  - app/e/[publicId]/convite.png/invite-image.tsx
  - app/e/[publicId]/convite.png/route.test.tsx
  - app/e/[publicId]/convite.png/route.tsx
  - lib/database.types.ts
  - supabase/migrations/202608110002_r07_lineup_contract.sql
  - supabase/tests/038_r07_lineup_contract.test.sql
tests:
  - "db:reset: schema, seed e buckets concluídos"
  - "db:lint: verde; somente avisos legados em create_event_as_staff e record_match_event"
  - "db:test: 38 arquivos, 943 testes verdes"
  - "038_r07_lineup_contract: 31 testes verdes"
  - "db:types, ESLint e TypeScript: verdes"
  - "Vitest: 48 arquivos, 283 testes verdes"
  - "next build --webpack: verde; Turbopack local impedido por bind interno do runner"
  - "npm audit --audit-level=moderate: 0 vulnerabilidades"
blocker: null
next_action: "Implementar WP-R07-02: interface mobile-first de divisão manual na página do evento, usando as RPCs do CP1 e mantendo team_division desligada."
---

# Trabalho atual

O CP1 da R07 está concluído. O banco agora possui consentimento esportivo
explícito, exclusão, rascunho transacional, revisão publicada e vínculo estreito
com lado de partida. A elegibilidade é revalidada no banco e RSVP, escalação
planejada e participação real continuam fontes separadas.

As estruturas são inertes: `team_division` permanece fail-closed e não recebeu
habilitação automática. App N ignora as tabelas novas; App N+1 poderá usar as
RPCs geradas sem exigir contração antecipada dos grants legados.

A próxima ação é `WP-R07-02`: criar a jornada mobile de 2 a 12 equipes na página
do evento, com toque como caminho principal, alternativa acessível para mover,
retirar e recolocar atletas, estado de salvamento/replay e fallback para a lista
de confirmados quando a flag ou o contrato não estiverem disponíveis.
