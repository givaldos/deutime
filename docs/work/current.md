---
release: R07
work_package: WP-R07-04
scope: lineup_pilot_and_completion
branch_or_commit: "dev"
checkpoint: CP4
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
  - supabase/migrations/202608110003_r07_public_lineup_projection.sql
  - supabase/tests/039_r07_public_lineup_projection.test.sql
  - lib/data/public-lineup.ts
  - app/e/[publicId]/page.tsx
  - app/e/[publicId]/convite.png/route.tsx
  - app/e/[publicId]/convite.png/invite-image.tsx
  - app/me/perfil/editar/page.tsx
  - components/event-lineup-editor.tsx
  - components/event-lineup-share-actions.tsx
tests:
  - "validação física 390x844: publicar, projetar, compartilhar, retirar e revogar verdes"
  - "imagem consentida: 1200x630 e cache private/no-store"
  - "Vitest focado: 7 arquivos, 37 testes verdes"
  - "Vitest completo: 53 arquivos, 305 testes verdes"
  - "db:reset, db:types e db:test: verdes; 39 arquivos, 960 testes pgTAP"
  - "db:lint: verde; somente avisos legados em create_event_as_staff e record_match_event"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "Turbopack local impedido por bind interno do runner"
  - "npm audit --audit-level=moderate: 0 vulnerabilidades"
blocker: null
next_action: "Executar WP-R07-04: piloto demo controlado, observabilidade, smoke e ensaio de rollback por flag antes de concluir a R07."
---

# Trabalho atual

O CP3 da R07 está concluído. Owner/admin publica revisões explícitas da divisão,
a URL canônica mostra somente nomes esportivos consentidos e a imagem pode ser
compartilhada, baixada ou acessada pelo fallback de link.

A projeção anônima é estreita e fail-closed, revogação é recalculada em cada
leitura e cache compartilhado é desativado na arte publicada. Lista, evento e
rascunho continuam disponíveis quando publicação ou flag não estiverem ativos.

A próxima ação é `WP-R07-04`: ativar somente uma coorte demo, observar a jornada
em aparelhos, executar smoke e rollback por flag e então concluir a release.
