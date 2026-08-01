---
release: R03
work_package: WP-R03-04
scope: whatsapp_sandbox_template_profile
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
  - "lib/features/delivery/twilio-pilot-config.ts"
  - "lib/features/delivery/twilio-pilot-config.test.ts"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/work/current.md"
tests:
  - "16 testes focados aprovados"
  - "37 arquivos e 209 testes Vitest aprovados"
  - "typecheck aprovado"
  - "lint e build de produção aprovados"
  - "prova real: accepted > sent > delivered > read"
blocker: null
next_action: "Publicar suporte ao perfil event_call_v1 e atualizar TWILIO_TEMPLATE_PROFILE na Vercel."
---

# Trabalho atual

A primeira entrega física nova foi aceita e lida sem ambiguidade. O consumo está
desligado. O callback por tentativa processou todos os estados e não exige
revisão.

O Content SID customizado usa três variáveis, mas a Vercel ainda seleciona o
perfil de duas variáveis do template pré-aprovado. O código passa a aceitar
`event_call_v1`; depois do deploy, basta trocar a variável de ambiente e fazer
um novo envio isolado.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
