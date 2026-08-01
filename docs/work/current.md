---
release: R04
work_package: DP-R04-01
scope: event_match_decision
branch_or_commit: "codex/r04-event-match-decision"
checkpoint: idle
status: ready_for_review
completed_ac: []
dirty_files: []
tests:
  - "revisão documental do schema, RPCs, UI e invariantes atuais"
  - "compatibilidade N/N−1 e migração forward-only definidas no ADR"
  - "lint e typecheck aprovados"
  - "38 arquivos e 215 testes Vitest aprovados"
  - "build de produção aprovado"
  - "security:audit aprovado sem vulnerabilidades"
blocker: "DEC-PUBLIC-PRIVACY permanece aberta antes da expansão de banco e da projeção pública R04."
next_action: "Fechar DEC-PUBLIC-PRIVACY e completar DP-R04-01 antes de iniciar WP-R04-01."
---

# Trabalho atual

`DEC-EVENT-MATCH` está aceita. O evento permanece como ocorrência e URL
canônica de zero a muitas partidas; cada partida tem exatamente dois lados,
participação real distinta de RSVP/escalação e timeline append-only.

O pacote R04 registra backfill da súmula legada, wrappers compatíveis para a
partida única, falha fechada diante de múltiplos confrontos, rollout por flag e
fallback manual. Nenhuma migration, flag ou dado de produção foi alterado.

A próxima ação é resolver a matriz pública/identificada de nome, foto,
escalação, participação, autoria e resultado em `DEC-PUBLIC-PRIVACY`. As
alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md` permanecem
separadas.
