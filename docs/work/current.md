---
release: R02
work_package: maintenance
scope: public_player_event_visual_consistency
branch_or_commit: "codex/public-profile-event-style"
checkpoint: idle
status: complete
completed_ac: []
dirty_files: []
tests:
  - "Vitest focado — páginas públicas de perfil e evento, 2 arquivos/11 testes aprovados"
  - "npm run lint — aprovado"
  - "npm run typecheck — aprovado"
  - "npm run build — aprovado"
blocker: null
next_action: "Executar CP2 de WP-R02-03: criar Server Action estreita e controles mobile SIM/NÃO/TALVEZ na página reconhecida, com fallback de leitura para banco N−1 e event_capability_rsvp desligada."
---

# Trabalho atual

O perfil público `/p/{handle}` agora segue a mesma composição mobile da página
pública do evento: identidade no header compacto e conteúdo em superfícies com
camada explícita, `z-index` e sobreposição de `32 px`.

O contrato de dados e as informações públicas não mudaram. A próxima ação
continua sendo o CP2 de `WP-R02-03`; `event_capability_rsvp` permanece
desligada.
