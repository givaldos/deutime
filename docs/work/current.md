---
release: R03
work_package: WP-R03-04
scope: whatsapp_sandbox_template_profile
branch_or_commit: "13ff1a5"
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
  - "16 testes focados aprovados"
  - "37 arquivos e 209 testes Vitest aprovados"
  - "typecheck aprovado"
  - "lint e build de produção aprovados"
  - "prova real: accepted > sent > delivered > read"
  - "PR #72, gates, deploy e smoke aprovados"
  - "TWILIO_TEMPLATE_PROFILE=event_call_v1 ativo no redeploy de produção"
blocker: null
next_action: "Criar uma nova intenção demo e validar as três variáveis em um único envio autorizado."
---

# Trabalho atual

A primeira entrega física nova foi aceita e lida sem ambiguidade. O consumo está
desligado. O callback por tentativa processou todos os estados e não exige
revisão.

O Content SID customizado e a Vercel agora usam o perfil `event_call_v1`, com
nome, data e link separados. O redeploy de produção ficou pronto; falta apenas
uma nova prova física autorizada do conteúdo.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
