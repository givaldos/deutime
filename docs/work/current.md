---
release: R04
work_package: WP-R04-01
scope: match_expansion_and_operation
branch_or_commit: "dev"
checkpoint: CP4
status: in_progress
completed_ac: ["AC-R04-01","AC-R04-02","AC-R04-03","AC-R04-04","AC-R04-06","AC-R04-08"]
dirty_files:
  - supabase/migrations/202608070001_r04_match_expansion.sql
  - supabase/migrations/202608070002_r04_match_rpc.sql
  - supabase/migrations/202608070003_r04_match_public_mode.sql
  - supabase/migrations/202608070004_public_match_view.sql
  - supabase/migrations/202608070005_craque_voting.sql
  - supabase/tests/031_r04_match_expansion.test.sql
  - lib/features/match/validation.ts
  - lib/features/match/server.ts
  - lib/features/match/stats.ts
  - app/app/[teamSlug]/events/[eventId]/match/match-actions.ts
  - lib/data/matches.ts
  - lib/data/public-matches.ts
  - components/match-forms.tsx
  - app/app/[teamSlug]/events/[eventId]/match/page.tsx
  - app/e/[publicId]/page.tsx
  - docs/decisions/DEC-ANONYMOUS-RETENTION.md
  - docs/releases/R02-confirmacao-pelo-link.md
tests:
  - "lint 0"
  - "typecheck 0"
  - "219/219 vitest pass"
  - "migration-integrity origin/dev HEAD OK"
  - "CP4 public-matches via privileged"
  - "R04 piloto prod: event_matches=true, 2 partidas (1 finalized live, 1 scheduled externo), 1 participação + 1 gol"
  - "R05 draft craque_votes (hash+salt, recibo 7d)"
blocker: null
next_action: "D+1 AC-R02-09 amanhã + push 5 migrations via deploy-database.yml, depois finalizar R04 e aceitar DEC-ANONYMOUS-RETENTION para R05."
---

# Trabalho atual

WP-R04-01 CP1 concluído: tipos match_status/match_public_mode/match_event_kind, tabelas event_matches/match_sides/match_participations/match_events com RLS, backfill 1 partida ordinal 1 + 2 lados por match_reports, wrappers legados falham 40001 se >1 partida.

CP2 concluído: 5 RPCs security definer (create_event_match, set_match_participation, record_match_event, finalize_event_match, void_event_match) com is_team_staff, participação real como fonte de autoria, gol exige mesmo lado (adversário externo pode omitir).

CP3 concluído: Server Actions finas (createMatch/setParticipation/recordEvent) com zod + flag event_matches desligada, forms mobile CreateMatch/Participation/RecordEvent e wire em /app/[teamSlug]/events/[eventId]/match via getEventMatches (null = fallback súmula legada).

Nenhuma flag ligada em produção; R02-09/R03-06 evidências D já em docs/releases/R02-confirmacao-pelo-link.md:1186, D+1 pendente amanhã.
