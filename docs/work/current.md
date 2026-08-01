---
release: R04
work_package: DP-R04-01
scope: public_privacy_decision
branch_or_commit: "codex/r04-public-privacy-decision"
checkpoint: idle
status: ready_for_review
completed_ac: []
dirty_files: []
tests:
  - "revisão documental das views públicas, consentimentos, capabilities e UI atuais"
  - "matriz de quatro audiências e migração forward-only definidas no ADR"
  - "lint e typecheck aprovados"
  - "38 arquivos e 215 testes Vitest aprovados"
  - "build de produção aprovado"
  - "security:audit aprovado sem vulnerabilidades"
blocker: null
next_action: "Iniciar CP1 de WP-R04-01 com modelo de dados, constraints, RPCs, backfill e compatibilidade N/N−1."
---

# Trabalho atual

`DP-R04-01` concluiu o CP0. `DEC-EVENT-MATCH` e `DEC-PUBLIC-PRIVACY`
estão aceitas; não resta decisão estrutural bloqueando a expansão inerte da R04.

A superfície pública pode mostrar lados, placar e timeline sem autoria conforme
o modo do evento. Identidade esportiva exige consentimento próprio, versionado
e revogável. Capability pessoal continua limitada ao próprio atleta e não
revela terceiros. Staff não consente em nome de atleta não reivindicado.

Nenhuma migration, flag ou dado de produção foi alterado. A próxima ação é o
CP1 de `WP-R04-01`. As alterações locais do usuário em `docs/backlog.md` e
`docs/roadmap.md` permanecem separadas.
