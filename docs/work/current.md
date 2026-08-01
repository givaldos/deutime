---
release: R03
work_package: WP-R03-04
scope: whatsapp_sandbox_card_profile
branch_or_commit: "codex/r03-whatsapp-card"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
  - "AC-R03-02"
  - "AC-R03-03"
  - "AC-R03-04"
  - "AC-R03-05"
  - "AC-R03-07"
  - "AC-R03-08"
dirty_files: []
tests:
  - "37 testes focados aprovados"
  - "38 arquivos e 215 testes Vitest aprovados"
  - "typecheck aprovado"
  - "lint e build de produção aprovados"
  - "29 arquivos e 627 testes pgTAP aprovados"
  - "integridade das migrations preservada desde af9a248"
blocker: "Content SID de deutime_event_call_card_v1 ainda não cadastrado."
next_action: "Criar a Content Resource card+text, registrar o SID, publicar banco antes do app e validar a URL PNG em produção."
---

# Trabalho atual

A primeira entrega física foi aceita e lida sem ambiguidade. O novo perfil de
card está implementado de forma inerte e mantém o mesmo callback e a mesma
barreira contra reenvio ambíguo.

O card usa nome, data, link e a URL pública `.png` do evento como quarta
variável. A mesma Content Resource contém fallback `twilio/text`. Ainda faltam
o Content SID, o rollout banco/app e a prova física no Sandbox.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
