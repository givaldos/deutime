---
release: R02
work_package: WP-R02-02
scope: capability_and_persistent_session_ready
branch_or_commit: "codex/r02-capability-session-cp0"
checkpoint: idle
status: completed
completed_ac: []
dirty_files: []
tests:
  - "Definition of Ready de WP-R02-02 revisada contra as decisões aceitas e os entrypoints atuais"
  - "Contrato oficial de sessões, session_id e sign-out do Supabase revalidado em 29/07/2026"
  - "Matriz mínima de capability, sessão verificada, revogação, replay, isolamento e compatibilidade registrada"
blocker: null
next_action: "Executar o CP1 de WP-R02-02: fechar modelo de dados, RPCs, cookie, RLS/pgTAP e ordem de deploy forward-only."
---

# Trabalho atual

O CP0 de `WP-R02-02` fechou o contrato mínimo de capability por atleta/evento e
de sessão verificada por aparelho. O link usa fragmento, troca por `POST`
same-origin e cookie opaco restrito ao evento; nenhuma abertura por `GET` cria
sessão.

Sessões Supabase existentes serão inventariadas pelo `session_id` verificado
somente nas superfícies de R02. A revogação própria bloqueia imediatamente essas
permissões sem depender da expiração do JWT, e uma tombstone evita
autorregistro posterior da mesma sessão.

Não houve migration, código consumidor, ativação ou mutação de produção.
`event_capability_exchange` e `event_capability_rsvp` permanecem desligadas. A
próxima ação é o CP1 forward-only; RSVP continua reservado a `WP-R02-03`.
