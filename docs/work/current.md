---
release: R10
work_package: WP-R10-02
scope: recognition_private_view
branch_or_commit: "codex/r10-recognition-contract"
checkpoint: CP1
status: ready
completed_ac: [AC-R10-01, AC-R10-02, AC-R10-03, AC-R10-04, AC-R10-05, AC-R10-06, AC-R10-07, AC-R10-10, AC-R10-11]
dirty_files: []
tests:
  - "R10 pgTAP: 61 casos de contrato e 22 casos com duas conexões reais aprovados"
  - "Database CI: reset, lint, suíte completa e tipos gerados aprovados"
  - "gate: lint, TypeScript e 78 arquivos/438 testes aprovados"
  - "build de produção Webpack aprovado"
  - "npm audit de produção: 0 vulnerabilidades"
  - "CodeQL, dependency review e Terraform aprovados"
  - "N/N-1: expansão sem consumidor e sem ativação de time"
blocker: null
next_action: "Implementar WP-R10-02 com a visão privada móvel /me/reconhecimentos atrás da flag recognition, sem ativar time e preservando o perfil atual como fallback."
---

# Trabalho atual

`WP-R10-01` entregou a expansão inerte do reconhecimento positivo. O catálogo
`recognition-v1` possui somente gol, assistência e Craque agregado fechado;
todos os cartões são projeções reconstruíveis dos fatos esportivos, sem pontos,
nota, ranking, ledger ou contador paralelo.

A identidade vem da sessão e cada item preserva `athlete_id + team_id`. O
primeiro marco de ativação impede retroatividade, a flag fecha leituras e
consentimento, e correções ou anulações da fonte recompõem a projeção.

O resumo público permanece vazio sem `public_recognition_summary_v1` concedido
pelo próprio titular. Sua RPC retorna somente categoria e contagem, sem partida,
data, voto, colocação, time ou identificadores internos.

O CP1 foi comprovado por 83 asserções R10, incluindo duas conexões reais, além
do reset, lint, suíte histórica e tipos gerados no workflow Database. Nenhum
time, consumidor, interface ou efeito externo foi ativado.

## Próxima ação

Implementar `WP-R10-02`: criar a visão privada mobile-first em
`/me/reconhecimentos`, consumindo `get_my_recognitions()` somente atrás da flag
`recognition`. Manter perfil e estatísticas atuais como fallback e não ativar
organização neste pacote.
