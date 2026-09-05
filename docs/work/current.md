---
release: R14
work_package: WP-R14-01
scope: prelaunch_invite_only_team_creation
branch_or_commit: "codex/prelaunch-invite-only"
checkpoint: CP1
status: active
completed_ac:
  - "CP0 e contrato de segurança fechados em DEC-PRELAUNCH-INVITE-ACCESS"
  - "entrypoints, compatibilidade, rollout e rollback definidos"
dirty_files:
  - ".github/ISSUE_TEMPLATE/feature.yml"
  - "docs/decisions/DEC-PRELAUNCH-INVITE-ACCESS.md"
  - "docs/releases/R14-acesso-por-convite.md"
  - "docs/releases/README.md"
  - "docs/work/current.md"
tests: []
blocker: null
next_action: "Implementar migration inerte, UI, Action, comando operacional e testes focados da R14."
---

# Trabalho atual

A R14 restringe temporariamente a criação de novas equipes a códigos individuais
de convite. O segredo não é persistido em texto puro; criação e consumo são
atômicos. A política nasce desligada e terá rollback operacional sem perda de
dados.
