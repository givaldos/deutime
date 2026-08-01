---
release: R03
work_package: WP-R03-04
scope: whatsapp_callback_attempt_correlation
branch_or_commit: "main"
checkpoint: CP5
status: in_progress
completed_ac:
  - "AC-R03-01"
  - "AC-R03-02"
  - "AC-R03-03"
  - "AC-R03-04"
  - "AC-R03-05"
  - "AC-R03-07"
  - "AC-R03-08"
dirty_files:
  - "callback Route Handlers e contrato de dispatch"
  - "migration/RPC de correlação por tentativa"
  - "testes Vitest e pgTAP"
  - "documentação R03, arquitetura e segurança"
tests:
  - "19 testes Vitest focados aprovados"
  - "37 arquivos e 208 testes Vitest aprovados"
  - "typecheck aprovado"
  - "lint e build de produção aprovados"
  - "28 arquivos e 621 pgTAPs aprovados"
  - "db:reset e integridade de migrations aprovados"
blocker: null
next_action: "Executar verify, publicar banco antes do app e realizar um único envio novo no Sandbox."
---

# Trabalho atual

O callback novo usa o UUID não secreto da tentativa no caminho e mantém a
assinatura Twilio como autenticação. A RPC é exclusiva de `service_role`, aceita
callback antes do ack, replay e progressão monotônica. O endpoint anterior por
token opaco continua disponível somente para mensagens já emitidas.

A tentativa anterior permanece `failed/ambiguous`, exige revisão e não será
reutilizada. As alterações locais do usuário em `docs/backlog.md` e
`docs/roadmap.md` permanecem separadas.
