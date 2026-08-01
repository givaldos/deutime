---
release: R03
work_package: WP-R03-04
scope: whatsapp_twilio_mm_sid
branch_or_commit: "codex/r03-whatsapp-mm-sid"
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
dirty_files:
  - "lib/features/delivery/twilio-adapter.ts"
  - "lib/features/delivery/twilio-adapter.test.ts"
  - "lib/features/delivery/twilio-status-callback.ts"
  - "lib/features/delivery/twilio-status-callback.test.ts"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/work/current.md"
tests:
  - "17 testes focados do adapter, callback e Route Handler aprovados"
  - "lint e typecheck aprovados"
  - "36 arquivos e 204 testes Vitest aprovados"
  - "build de produção aprovado com acesso às fontes externas"
blocker: null
next_action: "Validar SM/MM, publicar e reconciliar a tentativa existente sem reenviar."
---

# Trabalho atual

O disparo único chegou à API da Twilio, que criou a mensagem e chamou o webhook,
mas retornou um Message SID `MM`. O adapter e o callback aceitavam apenas `SM`,
por isso a tentativa foi preservada como `failed/ambiguous`, sem SID persistido,
e o webhook respondeu 400.

Esta correção alinha os dois parsers ao contrato oficial `SM|MM` com 32 dígitos
hexadecimais. O consumo global já foi desligado e o outbox exige revisão; não
deve haver reenvio. `AC-R03-06` e a conclusão de `AC-R03-09` seguem pendentes.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
