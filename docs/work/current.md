---
release: R10
work_package: WP-R10-03
scope: recognition_public_summary
branch_or_commit: "codex/r10-recognition-private-view"
checkpoint: CP2
status: ready
completed_ac: [AC-R10-01, AC-R10-02, AC-R10-03, AC-R10-04, AC-R10-05, AC-R10-06, AC-R10-07, AC-R10-08, AC-R10-10, AC-R10-11]
dirty_files: []
tests:
  - "WP-R10-02: 3 arquivos/10 testes novos focados aprovados"
  - "gate: lint, TypeScript e 81 arquivos/448 testes aprovados"
  - "build de produção Webpack aprovado"
  - "npm audit de produção: 0 vulnerabilidades"
  - "PR: Database, tipos, CodeQL, dependency review, Terraform e Vercel aprovados"
  - "fallback: flag, schema, RPC ou payload indisponível preservam perfil e estatísticas"
  - "rollout: nenhum time ativado; Android/iPhone/WhatsApp real pendentes para CP4"
blocker: null
next_action: "Implementar WP-R10-03 com consentimento public_recognition_summary_v1 por vínculo e resumo agregado no perfil público, sem ativar time e sem reduzir o acesso privado na revogação."
---

# Trabalho atual

`WP-R10-02` entregou `/me/reconhecimentos` como visão privada mobile-first. A
rota usa a sessão autenticada e o catálogo `recognition-v1` para explicar gol,
assistência e Craque agregado com origem por time, evento e partida, sem pontos,
nota, sequência, ranking ou identificadores internos no HTML.

A navegação aparece somente quando um vínculo ativo possui `recognition`. Flag
desligada, schema/RPC indisponível ou payload inválido falham fechados e mantêm
o perfil, as estatísticas e o Craque atual como fallback.

O CP2 foi comprovado por 10 testes novos, 448 testes totais, lint, TypeScript,
build, audit e gates remotos de aplicação e banco. Nenhum time foi ativado.
Validação manual em aparelhos e navegador interno continua reservada ao CP4.

## Próxima ação

Implementar `WP-R10-03`: adicionar o controle de
`public_recognition_summary_v1` por vínculo na edição do perfil e consumir o
resumo agregado em `/p/{handle}`. Revogação deve retirar imediatamente somente
a fatia pública, sem reduzir a visão privada, e nenhum time será ativado neste
pacote.
