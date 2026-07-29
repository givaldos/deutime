---
release: R02
work_package: WP-R02-03
scope: capability_rsvp_ready
branch_or_commit: "codex/r02-rsvp-ready"
checkpoint: idle
status: ready
completed_ac: []
dirty_files: []
tests:
  - "npm run verify — lint, typecheck, 21 arquivos/124 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "Android físico — WhatsApp e Chrome aprovados; layout, retorno, cópia/compartilhamento e fragmento limpo"
  - "iPhone físico — WhatsApp e Safari aprovados; layout, retorno, cópia/compartilhamento e fragmento limpo"
blocker: null
next_action: "Executar CP1 de WP-R02-03: definir a RPC transacional de resposta por acesso reconhecido, lock, atribuição de responded_by, auditoria, grants/RLS, pgTAP e compatibilidade N/N−1, mantendo event_capability_rsvp desligada."
---

# Trabalho atual

O CP0 de `WP-R02-03` fechou a jornada SIM/NÃO/TALVEZ, inclusive a precedência
entre capability e sessão verificada, a atribuição segura de `responded_by`, os
estados somente leitura e a matriz negativa/cross-tenant. A confirmação
autenticada atual permanece como fallback.

O checkpoint está ocioso e pronto para CP1. A implementação pode avançar
localmente com `event_capability_rsvp` desligada. A matriz física de CP4 de
`WP-R02-02` foi concluída em Android/iPhone, nos navegadores interno e padrão,
sem ativar gates; o piloto ainda exige escolha explícita de coorte.
